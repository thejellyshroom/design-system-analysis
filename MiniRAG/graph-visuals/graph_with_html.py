#!/usr/bin/env python3
"""Render MiniRAG GraphML as an interactive HTML graph (PyVis)."""

from pathlib import Path

import networkx as nx
import random

try:
    from pyvis.network import Network
except ImportError as err:
    raise SystemExit(
        "Missing pyvis. Install with: pip install pyvis"
    ) from err

# Repo root = design-extraction/ (this file lives in MiniRAG/graph-visuals/)
REPO_ROOT = Path(__file__).resolve().parents[2]
GRAPHML = REPO_ROOT / "design-md-kg" / "graph_chunk_entity_relation.graphml"
OUT_HTML = REPO_ROOT / "design-md-kg" / "knowledge_graph.html"


def main() -> None:
    if not GRAPHML.is_file():
        raise SystemExit(
            f"Missing graph file: {GRAPHML}\n"
            "Run: python scripts/build_design_md_kg.py"
        )

    G = nx.read_graphml(GRAPHML)
    net = Network(height="100vh", width="100%", notebook=False, directed=True)
    net.from_nx(G)

    for node in net.nodes:
        node["color"] = "#{:06x}".format(random.randint(0, 0xFFFFFF))
        if "description" in node:
            node["title"] = node["description"]

    for edge in net.edges:
        if "description" in edge:
            edge["title"] = edge["description"]

    net.write_html(str(OUT_HTML))
    print(f"Wrote {OUT_HTML}")
    print("Open that file in a browser, or run: python graph_with_html.py (from any cwd)")


if __name__ == "__main__":
    main()
