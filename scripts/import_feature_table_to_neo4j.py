#!/usr/bin/env python3
"""
Import analysis/features.json into Neo4j (Aura or local).

Creates:
  (:Company {slug, name, ...enumProps, notes})
  (:Feature {key, value})
  (:Company)-[:HAS_FEATURE]->(:Feature)

Env (or repo-root .env):
  NEO4J_URI
  NEO4J_USERNAME
  NEO4J_PASSWORD

Notes:
- Uses MERGE to keep it idempotent.
- Use --clear to delete Company/Feature subgraph before re-import.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from dotenv import load_dotenv

try:
  from neo4j import GraphDatabase
except ImportError as err:
  raise SystemExit('Install neo4j: pip install neo4j') from err


REPO_ROOT = Path(__file__).resolve().parents[1]
FEATURES_PATH = REPO_ROOT / 'analysis' / 'features.json'


def load_rows() -> list[dict]:
  obj = json.loads(FEATURES_PATH.read_text(encoding='utf-8'))
  return obj.get('rows') or []


def clear_subgraph(tx) -> None:
  tx.run('MATCH (c:Company)-[r:HAS_FEATURE]->(f:Feature) DELETE r')
  tx.run('MATCH (c:Company) DELETE c')
  tx.run('MATCH (f:Feature) DELETE f')


CREATE_COMPANIES = """
UNWIND $rows AS row
MERGE (c:Company {slug: row.company.slug})
SET c.name = row.company.name,
    c.notes = row.notes
WITH c, row
CALL {
  WITH c, row
  UNWIND keys(row.features) AS k
  SET c[k] = row.features[k]
  RETURN count(*) AS _
}
RETURN count(*) AS written
"""


CREATE_FEATURES_AND_REL = """
UNWIND $rows AS row
MATCH (c:Company {slug: row.company.slug})
UNWIND keys(row.features) AS k
WITH c, k, row.features[k] AS v
MERGE (f:Feature {key: k, value: v})
MERGE (c)-[:HAS_FEATURE]->(f)
RETURN count(*) AS rels
"""


def main() -> None:
  load_dotenv(REPO_ROOT / '.env')
  rows = load_rows()
  if not rows:
    raise SystemExit('No rows found. Run: python scripts/extract_feature_table.py')

  parser = argparse.ArgumentParser(description='Import analysis/features.json into Neo4j')
  parser.add_argument('--clear', action='store_true')
  args = parser.parse_args()

  uri = os.getenv('NEO4J_URI')
  user = os.getenv('NEO4J_USERNAME', 'neo4j')
  password = os.getenv('NEO4J_PASSWORD')
  if not uri:
    raise SystemExit('Missing NEO4J_URI')
  if not password:
    raise SystemExit('Missing NEO4J_PASSWORD')

  driver = GraphDatabase.driver(uri, auth=(user, password))
  try:
    with driver.session() as session:
      if args.clear:
        session.execute_write(clear_subgraph)
        print('Cleared (:Company)-[:HAS_FEATURE]->(:Feature) subgraph')

      session.execute_write(lambda tx: tx.run(CREATE_COMPANIES, rows=rows).consume())
      session.execute_write(lambda tx: tx.run(CREATE_FEATURES_AND_REL, rows=rows).consume())

    print(f'Imported {len(rows)} companies into Neo4j')
  finally:
    driver.close()


if __name__ == '__main__':
  main()

