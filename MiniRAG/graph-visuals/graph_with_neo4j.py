#!/usr/bin/env python3
"""
Load MiniRAG GraphML (e.g. design-md-kg/graph_chunk_entity_relation.graphml) into Neo4j.

No APOC required — plain Cypher only.

Env (or repo-root .env):
  NEO4J_URI       default bolt://localhost:7687
  NEO4J_USERNAME  default neo4j
  NEO4J_PASSWORD  required
  DESIGN_KG_DIR   optional absolute path to folder containing the graphml (default: repo/design-md-kg)

Install: pip install neo4j python-dotenv
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

try:
    from neo4j import GraphDatabase
except ImportError as err:
    raise SystemExit("Install neo4j: pip install neo4j") from err

_REPO_ROOT = Path(__file__).resolve().parents[2]

_GRAPHML_NS = {"": "http://graphml.graphdrawing.org/xmlns"}


def graphml_to_nodes_edges(graphml_path: str) -> dict | None:
    """Parse MiniRAG graph_chunk_entity_relation.graphml (stdlib only; no minirag import)."""
    try:
        tree = ET.parse(graphml_path)
        root = tree.getroot()
        data: dict = {"nodes": [], "edges": []}

        def txt(elem):
            if elem is None or elem.text is None:
                return ""
            return elem.text

        for node in root.findall(".//node", _GRAPHML_NS):
            d0 = node.find("./data[@key='d0']", _GRAPHML_NS)
            d1 = node.find("./data[@key='d1']", _GRAPHML_NS)
            d2 = node.find("./data[@key='d2']", _GRAPHML_NS)
            node_id = (node.get("id") or "").strip('"')
            data["nodes"].append(
                {
                    "id": node_id,
                    "entity_type": txt(d0).strip('"') if d0 is not None else "",
                    "description": txt(d1),
                    "source_id": txt(d2),
                }
            )

        for edge in root.findall(".//edge", _GRAPHML_NS):
            d3 = edge.find("./data[@key='d3']", _GRAPHML_NS)
            d4 = edge.find("./data[@key='d4']", _GRAPHML_NS)
            d5 = edge.find("./data[@key='d5']", _GRAPHML_NS)
            d6 = edge.find("./data[@key='d6']", _GRAPHML_NS)
            w = 0.0
            if d3 is not None and d3.text is not None:
                try:
                    w = float(d3.text)
                except ValueError:
                    w = 0.0
            data["edges"].append(
                {
                    "source": (edge.get("source") or "").strip('"'),
                    "target": (edge.get("target") or "").strip('"'),
                    "weight": w,
                    "description": txt(d4),
                    "keywords": txt(d5),
                    "source_id": txt(d6),
                }
            )

        print(f"Found {len(data['nodes'])} nodes and {len(data['edges'])} edges")
        return data
    except ET.ParseError as e:
        print(f"Error parsing GraphML: {e}")
        return None
    except OSError as e:
        print(f"Error reading file: {e}")
        return None

DEFAULT_KG_DIR = _REPO_ROOT / "design-md-kg"
GRAPHML_NAME = "graph_chunk_entity_relation.graphml"
JSON_NAME = "graph_data.json"

BATCH_SIZE_NODES = 500
BATCH_SIZE_EDGES = 200


def _load_env() -> None:
    if load_dotenv:
        load_dotenv(_REPO_ROOT / ".env")


def convert_graphml_to_json(graphml_path: Path, json_path: Path) -> dict | None:
    if not graphml_path.is_file():
        print(f"Error: file not found — {graphml_path}")
        return None
    json_path.parent.mkdir(parents=True, exist_ok=True)
    data = graphml_to_nodes_edges(str(graphml_path))
    if not data:
        print("Failed to parse GraphML")
        return None
    json_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote intermediate JSON: {json_path}")
    return data


def _infer_rel_type(keywords: str) -> str:
    if not keywords:
        return "RELATED_TO"
    k = keywords.lower()
    for token in ("lead", "participate", "uses", "located", "occurs", "contains", "implements"):
        if token in k:
            return token.upper()
    first = keywords.split(",")[0].strip().strip('"').strip("'")
    safe = "".join(c if c.isalnum() else "_" for c in first)[:60] or "RELATED_TO"
    return safe.upper()


CREATE_NODES = """
UNWIND $nodes AS node
MERGE (e:DesignEntity {id: node.id})
SET e.entity_type = node.entity_type,
    e.description = node.description,
    e.source_id = node.source_id
"""

CREATE_EDGES = """
UNWIND $edges AS edge
MATCH (source:DesignEntity {id: edge.source})
MATCH (target:DesignEntity {id: edge.target})
CREATE (source)-[r:RELATES_TO {
  weight: edge.weight,
  description: edge.description,
  keywords: edge.keywords,
  source_id: edge.source_id,
  rel_type: edge.rel_type
}]->(target)
"""


def _prepare_edges(edges: list[dict]) -> list[dict]:
    out = []
    for e in edges:
        row = dict(e)
        row["rel_type"] = _infer_rel_type(str(row.get("keywords") or ""))
        out.append(row)
    return out


def write_nodes_batched(tx, rows: list[dict]) -> None:
    for i in range(0, len(rows), BATCH_SIZE_NODES):
        tx.run(CREATE_NODES, nodes=rows[i : i + BATCH_SIZE_NODES])


def clear_graph(tx) -> None:
    tx.run("MATCH (n:DesignEntity) DETACH DELETE n")


def main() -> None:
    _load_env()

    parser = argparse.ArgumentParser(description="Import MiniRAG GraphML into Neo4j")
    parser.add_argument(
        "--kg-dir",
        type=Path,
        default=Path(os.getenv("DESIGN_KG_DIR", str(DEFAULT_KG_DIR))),
        help="Directory with graph_chunk_entity_relation.graphml",
    )
    parser.add_argument(
        "--skip-json",
        action="store_true",
        help="Do not write graph_data.json (still parses GraphML in memory)",
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Delete all :DesignEntity nodes (and their rels) before import",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only convert GraphML → JSON and print counts; no Neo4j",
    )
    args = parser.parse_args()

    kg_dir = args.kg_dir.resolve()
    graphml = kg_dir / GRAPHML_NAME
    json_path = kg_dir / JSON_NAME

    if args.skip_json:
        data = graphml_to_nodes_edges(str(graphml))
        if data is None:
            sys.exit(1)
    else:
        data = convert_graphml_to_json(graphml, json_path)
        if data is None:
            sys.exit(1)

    nodes = data.get("nodes") or []
    edges = _prepare_edges(data.get("edges") or [])
    print(f"Importing {len(nodes)} nodes, {len(edges)} edges")

    if args.dry_run:
        return

    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    user = os.getenv("NEO4J_USERNAME", "neo4j")
    password = os.getenv("NEO4J_PASSWORD")
    if not password:
        raise SystemExit("Set NEO4J_PASSWORD in environment or .env")

    driver = GraphDatabase.driver(uri, auth=(user, password))
    try:
        with driver.session() as session:
            if args.clear:
                session.execute_write(clear_graph)
                print("Cleared existing :DesignEntity graph")

            session.execute_write(write_nodes_batched, nodes)

            def write_edges(tx):
                for i in range(0, len(edges), BATCH_SIZE_EDGES):
                    batch = edges[i : i + BATCH_SIZE_EDGES]
                    tx.run(CREATE_EDGES, edges=batch)

            session.execute_write(write_edges)

        print("Neo4j import finished.")
    finally:
        driver.close()


if __name__ == "__main__":
    main()
