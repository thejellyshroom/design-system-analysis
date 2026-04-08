#!/usr/bin/env python3
"""
Extract a categorical feature table from design-md/*/DESIGN.md using an OpenAI chat model.

Writes/updates:
  analysis/features.json

Env:
  OPENAI_API_KEY (required)
  OPENAI_API_BASE (optional; default https://api.openai.com/v1)
  FEATURE_TABLE_MODEL (optional; default gpt-4o-mini)
  FEATURE_TABLE_MAX_ASYNC (optional; default 2)

Notes:
- Designed to be low-drama and schema-driven.
- Produces closed-enum values + one free-text notes field.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
from pathlib import Path

from dotenv import load_dotenv


REPO_ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = REPO_ROOT / 'analysis' / 'features.schema.json'
OUT_PATH = REPO_ROOT / 'analysis' / 'features.json'
DESIGN_MD_ROOT = REPO_ROOT / 'design-md'

# Canonical README.md ## Collection grouping (do not let the LLM override).
_AI = 'aiAndMachineLearning'
_DEV = 'developerToolsAndPlatforms'
_INFRA = 'infrastructureAndCloud'
_DESIGN = 'designAndProductivity'
_FINTECH = 'fintechAndCrypto'
_ENT = 'enterpriseAndConsumer'
_AUTO = 'automotiveAndMobility'

README_COLLECTION_BUCKET_BY_SLUG: dict[str, str] = {
    'claude': _AI, 'cohere': _AI, 'elevenlabs': _AI, 'minimax': _AI, 'mistral.ai': _AI,
    'ollama': _AI, 'opencode.ai': _AI, 'replicate': _AI, 'runwayml': _AI, 'together.ai': _AI,
    'voltagent': _AI, 'x.ai': _AI,
    'cursor': _DEV, 'expo': _DEV, 'linear.app': _DEV, 'lovable': _DEV, 'mintlify': _DEV,
    'posthog': _DEV, 'raycast': _DEV, 'resend': _DEV, 'sentry': _DEV, 'supabase': _DEV,
    'superhuman': _DEV, 'vercel': _DEV, 'warp': _DEV, 'zapier': _DEV,
    'clickhouse': _INFRA, 'composio': _INFRA, 'hashicorp': _INFRA, 'mongodb': _INFRA,
    'sanity': _INFRA, 'stripe': _INFRA,
    'airtable': _DESIGN, 'cal': _DESIGN, 'clay': _DESIGN, 'figma': _DESIGN, 'framer': _DESIGN,
    'intercom': _DESIGN, 'miro': _DESIGN, 'notion': _DESIGN, 'pinterest': _DESIGN, 'webflow': _DESIGN,
    'coinbase': _FINTECH, 'kraken': _FINTECH, 'revolut': _FINTECH, 'wise': _FINTECH,
    'airbnb': _ENT, 'apple': _ENT, 'ibm': _ENT, 'nvidia': _ENT, 'spacex': _ENT,
    'bmw': _AUTO, 'ferrari': _AUTO, 'lamborghini': _AUTO, 'renault': _AUTO, 'tesla': _AUTO,
    'spotify': _ENT, 'uber': _ENT,
}


def apply_readme_collection_bucket(row: dict) -> dict:
  slug = (row.get('company') or {}).get('slug')
  if not slug:
    return row
  bucket = README_COLLECTION_BUCKET_BY_SLUG.get(slug)
  if bucket:
    row.setdefault('features', {})['collectionBucket'] = bucket
  return row


def load_schema() -> dict:
  return json.loads(SCHEMA_PATH.read_text(encoding='utf-8'))


def load_rows() -> dict:
  if not OUT_PATH.exists():
    return {'version': '1.0.0', 'updatedAt': '', 'schemaVersion': '', 'rows': []}
  return json.loads(OUT_PATH.read_text(encoding='utf-8'))


def write_rows(obj: dict, schema: dict | None = None) -> None:
  # Back-compat migration: drop any lingering evidence fields.
  rows = obj.get('rows') or []
  for row in rows:
    if isinstance(row, dict):
      row.pop('evidence', None)
  obj['rows'] = rows
  if schema:
    obj['schemaVersion'] = schema.get('version', obj.get('schemaVersion', ''))
  OUT_PATH.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def discover_design_docs(limit: int) -> list[dict]:
  docs = []
  for folder in sorted(DESIGN_MD_ROOT.iterdir()):
    if not folder.is_dir():
      continue
    md = folder / 'DESIGN.md'
    if not md.is_file():
      continue
    slug = folder.name
    docs.append({
      'slug': slug,
      'path': md,
      'text': md.read_text(encoding='utf-8', errors='replace')
    })
  if limit and limit > 0:
    docs = docs[:limit]
  return docs


def schema_summary(schema: dict) -> dict:
  return {
    'version': schema.get('version'),
    'features': [
      {
        'key': f['key'],
        'group': f.get('group'),
        'allowed': f.get('allowed')
      }
      for f in schema.get('features', [])
    ],
    'notesField': schema.get('notesField', {'key': 'notes'})
  }


def schema_summary_for_keys(schema: dict, keys: list[str]) -> dict:
  features = schema.get('features', [])
  allowed = {f['key']: f for f in features if isinstance(f, dict) and 'key' in f}
  out = []
  for key in keys:
    f = allowed.get(key)
    if not f:
      continue
    out.append({'key': f['key'], 'group': f.get('group'), 'allowed': f.get('allowed')})
  return {
    'version': schema.get('version'),
    'features': out
  }


def build_prompt(schema: dict, slug: str, design_md: str) -> str:
  summary = schema_summary(schema)
  return (
    'You are extracting a STRICT feature row from a DESIGN.md document.\n'
    'Return ONLY valid JSON. No markdown. No commentary.\n\n'
    'Rules:\n'
    '- All feature values must be one of the allowed enum strings.\n'
    '- If unsure, use \"unknown\".\n'
    '- Notes are REQUIRED.\n'
    '- Notes should be 4–10 sentences and cover: overall vibe, color strategy, typography, density/depth, theme mode (dark vs light), shape language (pill/rounded/sharp), and how content is presented (code vs screenshots vs photography vs illustration).\n'
    '- Keep notes under 1200 characters.\n\n'
    f'SCHEMA_SUMMARY_JSON:\n{json.dumps(summary, ensure_ascii=False)}\n\n'
    f'COMPANY_SLUG: {slug}\n\n'
    'Output JSON shape:\n'
    '{\n'
    '  "company": {"slug": "...", "name": "..."},\n'
    '  "source": {"designMdPath": "design-md/<slug>/DESIGN.md"},\n'
    '  "features": { "<featureKey>": "<allowedEnum>", ... },\n'
    '  "notes": "..."\n'
    '}\n\n'
    'DESIGN_MD:\n'
    + design_md
  )


def build_prompt_only_fields(schema: dict, slug: str, design_md: str, keys: list[str]) -> str:
  summary = schema_summary_for_keys(schema, keys)
  return (
    'You are extracting STRICT enum feature values from a DESIGN.md document.\n'
    'Return ONLY valid JSON. No markdown. No commentary.\n\n'
    'Rules:\n'
    '- Only return values for the requested feature keys.\n'
    '- All returned values must be one of the allowed enum strings for that key.\n'
    '- If unsure, use \"unknown\".\n\n'
    f'REQUESTED_FEATURE_KEYS_JSON:\n{json.dumps(keys, ensure_ascii=False)}\n\n'
    f'SCHEMA_SUMMARY_JSON:\n{json.dumps(summary, ensure_ascii=False)}\n\n'
    f'COMPANY_SLUG: {slug}\n\n'
    'Output JSON shape:\n'
    '{\n'
    '  \"features\": { \"<featureKey>\": \"<allowedEnum>\", ... }\n'
    '}\n\n'
    'DESIGN_MD:\n'
    + design_md
  )


def parse_json_object(text: str) -> dict:
  text = text.strip()
  if not text:
    raise ValueError('empty response')
  start = text.find('{')
  end = text.rfind('}')
  if start == -1 or end == -1:
    raise ValueError('no json object found')
  return json.loads(text[start:end + 1])


def validate_row(schema: dict, row: dict) -> dict:
  features = row.get('features') or {}
  allowed_by_key = {f['key']: set(f['allowed']) for f in schema.get('features', [])}

  fixed = dict(row)
  fixed.setdefault('company', {})
  fixed.setdefault('source', {})
  fixed['company'].setdefault('slug', '')
  fixed['company'].setdefault('name', fixed['company'].get('slug', ''))
  fixed['source'].setdefault('designMdPath', '')

  out_features = {}
  for key, allowed in allowed_by_key.items():
    val = features.get(key, 'unknown')
    if val not in allowed:
      val = 'unknown'
    out_features[key] = val
  fixed['features'] = out_features

  # If the schema changes, ensure older rows don't sneak in stale keys
  fixed['features'] = {k: fixed['features'][k] for k in allowed_by_key.keys()}

  notes = fixed.get('notes')
  if not isinstance(notes, str):
    fixed['notes'] = ''
  elif len(notes) > 1200:
    fixed['notes'] = notes[:1197] + '...'

  # Notes-only dataset: ensure evidence isn't persisted even if model returns it
  fixed.pop('evidence', None)

  return fixed


def prune_row_features_to_schema(schema: dict, row: dict) -> dict:
  """
  Drop feature keys that are no longer in the schema, without auto-filling
  missing schema keys (so incremental extraction can still detect them).
  """
  schema_keys = [f.get('key') for f in schema.get('features', []) if isinstance(f, dict) and f.get('key')]
  fixed = dict(row or {})
  fixed.setdefault('company', {})
  fixed.setdefault('source', {})

  features = fixed.get('features') or {}
  if not isinstance(features, dict):
    features = {}

  fixed['features'] = {k: features[k] for k in schema_keys if k in features}
  fixed.pop('evidence', None)
  return fixed


def validate_feature_patch(schema: dict, patch: dict, keys: list[str]) -> dict:
  allowed_by_key = {f['key']: set(f['allowed']) for f in schema.get('features', [])}
  features = (patch.get('features') or {}) if isinstance(patch, dict) else {}

  out = {}
  for key in keys:
    allowed = allowed_by_key.get(key)
    if not allowed:
      continue
    val = features.get(key, 'unknown')
    if val not in allowed:
      val = 'unknown'
    out[key] = val
  return out


async def extract_one(client, model: str, schema: dict, doc: dict, sem: asyncio.Semaphore) -> dict:
  prompt = build_prompt(schema, doc['slug'], doc['text'])
  async with sem:
    resp = await client.chat.completions.create(
      model=model,
      messages=[
        {'role': 'system', 'content': 'You are a careful data extractor.'},
        {'role': 'user', 'content': prompt}
      ],
      temperature=0
    )
  content = resp.choices[0].message.content or ''
  row = parse_json_object(content)
  row = validate_row(schema, row)
  row['company']['slug'] = doc['slug']
  row['source']['designMdPath'] = f"design-md/{doc['slug']}/DESIGN.md"
  return apply_readme_collection_bucket(row)


async def extract_only_fields(client, model: str, schema: dict, doc: dict, keys: list[str], sem: asyncio.Semaphore) -> dict:
  prompt = build_prompt_only_fields(schema, doc['slug'], doc['text'], keys)
  async with sem:
    resp = await client.chat.completions.create(
      model=model,
      messages=[
        {'role': 'system', 'content': 'You are a careful data extractor.'},
        {'role': 'user', 'content': prompt}
      ],
      temperature=0
    )
  content = resp.choices[0].message.content or ''
  patch = parse_json_object(content)
  return validate_feature_patch(schema, patch, keys)


async def main_async(limit: int, only: str | None, force: bool) -> None:
  load_dotenv(REPO_ROOT / '.env')
  if not os.getenv('OPENAI_API_BASE'):
    os.environ['OPENAI_API_BASE'] = 'https://api.openai.com/v1'

  api_key = os.getenv('OPENAI_API_KEY')
  if not api_key:
    raise SystemExit('Missing OPENAI_API_KEY')

  from openai import AsyncOpenAI
  client = AsyncOpenAI(api_key=api_key, base_url=os.environ['OPENAI_API_BASE'])

  schema = load_schema()
  existing = load_rows()
  existing_rows = {r.get('company', {}).get('slug'): r for r in (existing.get('rows') or [])}
  schema_keys = [f.get('key') for f in schema.get('features', []) if isinstance(f, dict) and f.get('key')]

  # Always prune stale keys (schema removals) without filling new keys.
  for slug, row in list(existing_rows.items()):
    if not slug:
      continue
    existing_rows[slug] = prune_row_features_to_schema(schema, row)

  docs = discover_design_docs(limit)
  if only:
    docs = [d for d in docs if d['slug'] == only]
  if not docs:
    raise SystemExit('No documents found to process')

  model = os.getenv('FEATURE_TABLE_MODEL', 'gpt-4o-mini')
  max_async = int(os.getenv('FEATURE_TABLE_MAX_ASYNC', '2'))
  sem = asyncio.Semaphore(max_async)

  # Refresh keys: allows recomputing specific fields without full --force.
  # Also auto-refresh collectionBucket when schema version changes (common refinement).
  refresh_keys_raw = os.getenv('FEATURE_TABLE_REFRESH_KEYS', '')
  refresh_keys = [k.strip() for k in refresh_keys_raw.split(',') if k.strip()]
  if existing.get('schemaVersion') != schema.get('version'):
    if 'collectionBucket' not in refresh_keys and 'collectionBucket' in schema_keys:
      refresh_keys.append('collectionBucket')

  tasks = []
  patch_plan: dict[str, list[str]] = {}
  for doc in docs:
    slug = doc['slug']
    if slug not in existing_rows:
      tasks.append(('full', slug, extract_one(client, model, schema, doc, sem)))
      continue

    if force:
      tasks.append(('full', slug, extract_one(client, model, schema, doc, sem)))
      continue

    # Incremental mode: extract NEW FIELDS (missing keys) and/or refresh requested keys.
    existing_features = (existing_rows.get(slug) or {}).get('features') or {}
    missing = [k for k in schema_keys if k not in existing_features]
    refresh = [k for k in refresh_keys if k in schema_keys]
    need = sorted(set(missing + refresh))
    if not need:
      continue
    patch_plan[slug] = need
    tasks.append(('patch', slug, extract_only_fields(client, model, schema, doc, need, sem)))

  if not tasks:
    # Still persist schemaVersion + pruning changes even without LLM work.
    out = {
      'version': existing.get('version', schema.get('version', '1.0.0')),
      'updatedAt': '2026-04-07',
      'schemaVersion': schema.get('version', ''),
      'rows': [
        apply_readme_collection_bucket(validate_row(schema, existing_rows[k]))
        for k in sorted(existing_rows.keys())
      ]
    }
    write_rows(out, schema=schema)
    print('Nothing to do (no missing/refresh fields). Wrote pruned rows + schemaVersion metadata.')
    return

  full_count = sum(1 for t in tasks if t[0] == 'full')
  patch_count = sum(1 for t in tasks if t[0] == 'patch')
  print(f'Extracting full_rows={full_count} field_patches={patch_count} model={model} max_async={max_async}')
  results = await asyncio.gather(*[t[2] for t in tasks])

  for (kind, slug, _), result in zip(tasks, results):
    if kind == 'full':
      row = result
      existing_rows[row['company']['slug']] = row
      continue

    # patch
    patch = result
    row = existing_rows.get(slug)
    if not row:
      continue
    row_features = row.get('features') or {}
    for k, v in (patch or {}).items():
      row_features[k] = v
    row['features'] = row_features
    existing_rows[slug] = apply_readme_collection_bucket(validate_row(schema, row))

  out = {
    'version': existing.get('version', schema.get('version', '1.0.0')),
    'updatedAt': '2026-04-07',
    'schemaVersion': schema.get('version', ''),
    'rows': [
      apply_readme_collection_bucket(validate_row(schema, existing_rows[k]))
      for k in sorted(existing_rows.keys())
    ]
  }
  write_rows(out, schema=schema)
  print(f"Wrote {OUT_PATH} ({len(out['rows'])} rows total)")


def main() -> None:
  parser = argparse.ArgumentParser(description='Extract categorical feature table from DESIGN.md')
  parser.add_argument('--limit', type=int, default=0)
  parser.add_argument('--only', type=str, default='')
  parser.add_argument('--force', action='store_true', help='Re-extract even if row exists')
  parser.add_argument(
    '--refresh-keys',
    type=str,
    default='',
    help='Comma-separated feature keys to recompute (without full --force).'
  )
  args = parser.parse_args()
  only = args.only.strip() or None
  if args.refresh_keys.strip():
    os.environ['FEATURE_TABLE_REFRESH_KEYS'] = args.refresh_keys.strip()
  asyncio.run(main_async(args.limit, only, args.force))


if __name__ == '__main__':
  main()

