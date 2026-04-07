# Feature Table Spec (Design-MD Research Dataset)

This is the canonical spec for turning `design-md/*/DESIGN.md` into a structured dataset for analysis and Neo4j queries.

## Goals

- Produce a **feature table** (one row per company) with:
  - **categorical enums** for analysis/clustering
  - **one free-text notes field**
- Keep data **versionable** (diff-friendly, deterministic ordering).
- Keep Neo4j as a **view/query layer**, not the source of truth.

## Canonical files

- `analysis/features.schema.json`: schema (features, allowed values, definitions)
- `analysis/features.json`: dataset rows (company → features + notes)
- `analysis/insights.md`: narrative insights that reference dataset filters

## Row structure

Each company row in `analysis/features.json` follows this shape:

- `company.slug` (string): folder name under `design-md/` (e.g. `airbnb`, `mistral.ai`)
- `company.name` (string): display name (can equal slug capitalization)
- `source.designMdPath` (string): `design-md/<slug>/DESIGN.md`
- `features` (object): keys defined in `features.schema.json` with enum values
- `notes` (string): single free-text field (robust; still keep readable)

## Allowed values

All categorical columns are **closed enums**. When uncertain, use `unknown`.

## Interpretation rules

- Prefer **explicit statements** in DESIGN.md over inferred intent.
- For intent features (`primaryIntent`), treat as **hypothesis** inferred from repeated design choices; choose `unknown` if the document lacks signals.
- Use `notes` for nuance, caveats, and the “why”; avoid repeating the enum labels verbatim.

## Insight writing rules

Every insight in `analysis/insights.md` should include:

- **Filter**: a deterministic condition on the feature table (e.g. `productType=marketplace AND imageryUsage=imageFirst`)
- **Result size**: how many companies match
- **Examples**: 3–5 representatives
- **Counterexamples**: 1–2 near misses (optional)
- **Claim**: the hypothesis / insight

