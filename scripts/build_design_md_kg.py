#!/usr/bin/env python3
"""
Index design-md/*/DESIGN.md with MiniRAG to extract entities and relationships.

Loads repo-root .env. Expected variables:
  OPENAI_API_KEY   (required)
  OPENAI_API_BASE  (optional; defaults to https://api.openai.com/v1 — avoids KeyError in minirag openai client)
  DESIGN_KG_LLM_MODEL (optional; default gpt-5.4 — override if your account uses another id)
  DESIGN_KG_LLM_MAX_ASYNC (optional; default 4 — lower = fewer parallel LLM calls, helps 30k TPM limits)

Outputs under design-md-kg/:
  graph_chunk_entity_relation.graphml  (MiniRAG native)
  relationships_export.json            (edges for quick browsing)

Cross-company edges appear when the model links entities across docs (shared tech, fonts, patterns)
or when the same normalized entity name appears in multiple files.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
MINIRAG_ROOT = REPO_ROOT / "MiniRAG"
DESIGN_MD_ROOT = REPO_ROOT / "design-md"
DEFAULT_WORKING_DIR = REPO_ROOT / "design-md-kg"


def _bootstrap_path() -> None:
    sys.path.insert(0, str(MINIRAG_ROOT))


def _load_env() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    load_dotenv(REPO_ROOT / ".env")
    # MiniRAG openai client reads OPENAI_API_BASE when base_url is None; missing key crashes.
    if not os.getenv("OPENAI_API_BASE"):
        base = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        os.environ["OPENAI_API_BASE"] = base.rstrip("/")
    if not os.getenv("OPENAI_API_KEY"):
        for alt in (
            "CHATGPT_API_KEY",
            "CODEX_API_KEY",
            "OPENAI_CODEX_API_KEY",
        ):
            v = os.getenv(alt)
            if v:
                os.environ["OPENAI_API_KEY"] = v
                break


def discover_design_docs() -> tuple[list[str], list[str]]:
    docs: list[str] = []
    ids: list[str] = []
    if not DESIGN_MD_ROOT.is_dir():
        return docs, ids
    for folder in sorted(DESIGN_MD_ROOT.iterdir()):
        if not folder.is_dir():
            continue
        md_path = folder / "DESIGN.md"
        if not md_path.is_file():
            continue
        slug = folder.name
        body = md_path.read_text(encoding="utf-8", errors="replace")
        header = (
            "## Design system document metadata\n"
            f"- **company_folder**: `{slug}`\n"
            "- **document_type**: DESIGN.md (Stitch-style design specification)\n"
            "- **note**: Entities and relationships should be tied to this company when relevant.\n\n"
            "---\n\n"
        )
        docs.append(header + body)
        ids.append(f"{slug}/DESIGN.md")
    return docs, ids


def export_graph_edges(working_dir: Path) -> int:
    graph_path = working_dir / "graph_chunk_entity_relation.graphml"
    if not graph_path.is_file():
        return 0
    import networkx as nx

    graph = nx.read_graphml(graph_path)
    triples = []
    for source, target, data in graph.edges(data=True):
        row = {"source": source, "target": target}
        for k, val in data.items():
            row[k] = val if isinstance(val, (str, int, float, bool)) else str(val)
        triples.append(row)
    out_path = working_dir / "relationships_export.json"
    out_path.write_text(json.dumps(triples, indent=2), encoding="utf-8")
    return len(triples)


async def run_index(
    working_dir: Path,
    docs: list[str],
    doc_ids: list[str],
    llm_model: str,
    max_llm_tokens: int,
) -> None:
    _bootstrap_path()
    from minirag import MiniRAG
    from minirag.llm.openai import openai_complete, openai_embed
    from minirag.utils import EmbeddingFunc

    working_dir.mkdir(parents=True, exist_ok=True)
    max_llm_async = int(os.getenv("DESIGN_KG_LLM_MAX_ASYNC", "4"))
    rag = MiniRAG(
        working_dir=str(working_dir),
        llm_model_func=openai_complete,
        llm_model_name=llm_model,
        llm_model_max_token_size=max_llm_tokens,
        llm_model_max_async=max_llm_async,
        embedding_func_max_async=min(16, max(4, max_llm_async * 2)),
        embedding_func=EmbeddingFunc(
            embedding_dim=1536,
            max_token_size=8192,
            func=openai_embed,
        ),
    )
    print(f"Indexing {len(docs)} documents in one batch (MiniRAG skips already-stored ids)…")
    await rag.ainsert(docs, ids=doc_ids)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build MiniRAG KG from design-md DESIGN.md files")
    parser.add_argument(
        "--working-dir",
        type=Path,
        default=DEFAULT_WORKING_DIR,
        help="MiniRAG workspace (graph + kv stores)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Index only first N companies (0 = all)",
    )
    parser.add_argument(
        "--export-only",
        action="store_true",
        help="Only export relationships_export.json from existing working dir",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List discovered DESIGN.md paths and exit",
    )
    args = parser.parse_args()

    _load_env()
    if args.list:
        docs, ids = discover_design_docs()
        for doc_id in ids:
            print(doc_id)
        print(f"Total: {len(ids)}")
        return

    if not os.getenv("OPENAI_API_KEY"):
        print("Missing OPENAI_API_KEY (or CODEX_API_KEY / CHATGPT_API_KEY) in environment or .env")
        sys.exit(1)

    if args.export_only:
        n = export_graph_edges(args.working_dir)
        print(f"Exported {n} edges to {args.working_dir / 'relationships_export.json'}")
        return

    docs, doc_ids = discover_design_docs()
    if not docs:
        print(f"No DESIGN.md files under {DESIGN_MD_ROOT}")
        sys.exit(1)
    if args.limit and args.limit > 0:
        docs = docs[: args.limit]
        doc_ids = doc_ids[: args.limit]

    llm_model = os.getenv("DESIGN_KG_LLM_MODEL", "gpt-5.4")
    max_llm = int(os.getenv("DESIGN_KG_MAX_TOKENS", "8192"))
    print(f"LLM model: {llm_model} | docs: {len(docs)} | working_dir: {args.working_dir}")

    asyncio.run(
        run_index(
            args.working_dir,
            docs,
            doc_ids,
            llm_model=llm_model,
            max_llm_tokens=max_llm,
        )
    )
    n_edges = export_graph_edges(args.working_dir)
    print(f"Done. Graph: {args.working_dir / 'graph_chunk_entity_relation.graphml'}")
    print(f"Edges JSON: {args.working_dir / 'relationships_export.json'} ({n_edges} edges)")


if __name__ == "__main__":
    main()
