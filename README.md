<div align="center">

**Design system analysis & reference finder**

Fork of **[awesome-design-md](https://github.com/VoltAgent/awesome-design-md)** — this repo is mainly for **insights and quantitative analysis** over a shared corpus, plus a small **reference finder** app to explore similar sites by encoded design traits.

[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)
![DESIGN.md count](https://img.shields.io/badge/design--md%20corpus-58-10b981?style=classic)

</div>

---

## Why this fork

| Focus | Location |
|-------|-----------|
| **Narrative + evidence model** | [ANALYSIS.md](ANALYSIS.md) — patterns across companies (`[Table]`, `[KG]`, `[Hypothesis]`). |
| **Distributions, cross-tabs, traceability** | [analysis/ANALYSIS_FEATURE_TABLE.md](analysis/ANALYSIS_FEATURE_TABLE.md) — companion to the story doc. |
| **Structured feature data** | [analysis/features.json](analysis/features.json) (source of truth), [analysis/features.schema.json](analysis/features.schema.json), [analysis/features.csv](analysis/features.csv). |
| **Reference finder** | [reference-finder/](reference-finder/) — static UI: filters, goals, keywords, previews from `design-md/`. |
| **Scripts** | [scripts/](scripts/) — e.g. `extract_feature_table.py` to align buckets and refresh enums. |

The **`design-md/`** directory keeps the same **Stitch-style `DESIGN.md` + previews** as upstream: copy any folder’s `DESIGN.md` into a project and point an agent at it. This fork adds **taxonomy** (`collectionBucket`, theme, geometry, depth, payload, intent) and **documentation** built on top of that table.

**Upstream** for the living awesome list, new site requests, and the broader community: [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md).

---

## Reference finder (quick start)

Serve the **repository root** (paths are relative to `analysis/features.json` and `design-md/`):

```bash
python3 -m http.server 8000
```

Open **http://localhost:8000/reference-finder/** — use **Category** (collection bucket), optional filters, goals, search, and card previews where `preview.html` / `preview-dark.html` exist.

### Deploy on Vercel

The reference finder uses **relative URLs** to `../analysis/features.json` and `../design-md/…`, so Vercel must publish the **repository root** (not only `reference-finder/`).

1. Push this repo to GitHub (or connect your existing fork).
2. In [Vercel](https://vercel.com/new): **Add New Project** → import the repo.
3. **Framework Preset:** Other (or “No framework”).
4. **Root Directory:** `.` (leave default).
5. **Build Command:** leave **empty** (static files only).
6. **Output Directory:** leave **empty** — Vercel serves the repo root as static assets.

[`vercel.json`](vercel.json) redirects `/` → `/reference-finder/`. Your app will live at `https://<project>.vercel.app/reference-finder/`.

Optional: [`.vercelignore`](.vercelignore) skips heavy paths (`MiniRAG/`, `design-md-kg/`, etc.) so uploads stay smaller. Edit or delete it if you need those files online.

---

## Analysis docs (quick start)

1. Read [ANALYSIS.md](ANALYSIS.md) for the story and segment cheat-sheet.  
2. Use [analysis/ANALYSIS_FEATURE_TABLE.md](analysis/ANALYSIS_FEATURE_TABLE.md) for counts, `primaryIntent` × `contentFocus`, automotive vs enterprise slices, and the traceability index.  
3. Optional: [analysis/clusters.csv](analysis/clusters.csv) — exploratory KMeans on one-hot enums; **primary segmentation in prose is `collectionBucket`**, not cluster IDs.

**Big levers** in the table: `themeMode`, `shapeLanguage`, `shadowStyle`, `contentFocus`, `primaryIntent`.

---

## What is DESIGN.md?

[DESIGN.md](https://stitch.withgoogle.com/docs/design-md/overview/) is Google Stitch’s plain-text design spec for agents: one markdown file, no proprietary schema. Extended **Awesome** entries follow the [Stitch format](https://stitch.withgoogle.com/docs/design-md/format/) plus extra sections (responsive behavior, agent prompt guide, etc.).

| File | Role |
|------|------|
| `DESIGN.md` | What agents read |
| `preview.html` / `preview-dark.html` | Token and component catalog |

**How to use a file:** copy `design-md/<site>/DESIGN.md` into your project and tell your agent to implement against it.

---

## Collection (58 sites)

Paths are **in this repo** (`design-md/...`).

### AI & Machine Learning

- [**Claude**](design-md/claude/) — Warm terracotta accent, clean editorial layout  
- [**Cohere**](design-md/cohere/) — Enterprise AI, vibrant gradients  
- [**ElevenLabs**](design-md/elevenlabs/) — Dark cinematic, waveform cues  
- [**Minimax**](design-md/minimax/) — Bold dark, neon accents  
- [**Mistral AI**](design-md/mistral.ai/) — Minimal, purple-toned  
- [**Ollama**](design-md/ollama/) — Terminal-first monochrome  
- [**OpenCode AI**](design-md/opencode.ai/) — Developer-centric dark  
- [**Replicate**](design-md/replicate/) — White canvas, code-forward  
- [**RunwayML**](design-md/runwayml/) — Cinematic dark, media-rich  
- [**Together AI**](design-md/together.ai/) — Pastel / blueprint energy  
- [**VoltAgent**](design-md/voltagent/) — Void black, emerald accent  
- [**xAI**](design-md/x.ai/) — Stark monochrome  

### Developer Tools & Platforms

- [**Cursor**](design-md/cursor/) — Dark, gradient accents  
- [**Expo**](design-md/expo/) — Light, code-centric  
- [**Linear**](design-md/linear.app/) — Minimal, purple accent  
- [**Lovable**](design-md/lovable/) — Playful gradients  
- [**Mintlify**](design-md/mintlify/) — Docs-first, green accent  
- [**PostHog**](design-md/posthog/) — Olive / hedgehog personality  
- [**Raycast**](design-md/raycast/) — Dark chrome, gradients  
- [**Resend**](design-md/resend/) — Dark, monospace accents  
- [**Sentry**](design-md/sentry/) — Dark dashboard, pink-purple  
- [**Supabase**](design-md/supabase/) — Emerald, code-first  
- [**Superhuman**](design-md/superhuman/) — Premium light, purple hero  
- [**Vercel**](design-md/vercel/) — Black and white, Geist  
- [**Warp**](design-md/warp/) — Terminal IDE aesthetic  
- [**Zapier**](design-md/zapier/) — Warm orange, illustrations  

### Infrastructure & Cloud

- [**ClickHouse**](design-md/clickhouse/) — Neon on black  
- [**Composio**](design-md/composio/) — Dark, integration color  
- [**HashiCorp**](design-md/hashicorp/) — Enterprise B/W  
- [**MongoDB**](design-md/mongodb/) — Green leaf, docs  
- [**Sanity**](design-md/sanity/) — Red accent, editorial  
- [**Stripe**](design-md/stripe/) — Purple gradients  

### Design & Productivity

- [**Airtable**](design-md/airtable/) — Colorful structured UI  
- [**Cal.com**](design-md/cal/) — Neutral, scheduling  
- [**Clay**](design-md/clay/) — Organic, soft gradients  
- [**Figma**](design-md/figma/) — Colorful product UI  
- [**Framer**](design-md/framer/) — Black, blue, motion  
- [**Intercom**](design-md/intercom/) — Warm, conversational  
- [**Miro**](design-md/miro/) — Yellow, canvas  
- [**Notion**](design-md/notion/) — Warm minimal, serif  
- [**Pinterest**](design-md/pinterest/) — Red, masonry  
- [**Webflow**](design-md/webflow/) — Blue, polished marketing  

### Automotive & Mobility

- [**BMW**](design-md/bmw/) — Dual dark/light, sharp geometry  
- [**Ferrari**](design-md/ferrari/) — Editorial chiaroscuro, Rosso accents  
- [**Lamborghini**](design-md/lamborghini/) — Black canvas, gold CTAs, video heroes  
- [**Renault**](design-md/renault/) — NouvelR, aurora heroes, yellow CTAs  
- [**Tesla**](design-md/tesla/) — Minimal white, photography-first  

### Fintech & Crypto

- [**Coinbase**](design-md/coinbase/) — Blue, institutional  
- [**Kraken**](design-md/kraken/) — Purple dark UI  
- [**Revolut**](design-md/revolut/) — Dark, gradient cards  
- [**Wise**](design-md/wise/) — Green, friendly  

### Enterprise & Consumer

- [**Airbnb**](design-md/airbnb/) — Coral, photography, rounded  
- [**Apple**](design-md/apple/) — Cinematic, SF Pro  
- [**IBM**](design-md/ibm/) — Carbon, blue structure  
- [**NVIDIA**](design-md/nvidia/) — Green-black energy  
- [**SpaceX**](design-md/spacex/) — Stark B/W, full-bleed  
- [**Spotify**](design-md/spotify/) — Green on dark  
- [**Uber**](design-md/uber/) — Bold B/W, urban  

---

## Request a new DESIGN.md site

Use the **upstream** issue template: [design-md request (awesome-design-md)](https://github.com/VoltAgent/awesome-design-md/issues/new?template=design-md-request.yml).  
For **feature-table or reference-finder** changes in *this* fork, open an issue or PR here.

---

## Contributing

- **This fork:** improvements to `analysis/`, `reference-finder/`, `scripts/`, or documentation of insights.  
- **New `DESIGN.md` sites or token fixes in markdown:** consider [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) so the whole ecosystem stays in sync; this fork can merge or cherry-pick from upstream as needed.

See [CONTRIBUTING.md](CONTRIBUTING.md) if present.

---

## License

MIT License — see [LICENSE](LICENSE).

Design system text reflects publicly visible patterns on sites; identities remain with their owners. The analysis layer is for research and tooling, not rankings or prescriptions.
