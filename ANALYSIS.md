## Design System Analysis: Patterns Across 58 Companies

Public synthesis of cross-company design-system patterns, intended for **designers** and **engineers** who want a fast, evidence-grounded vocabulary for “why does this feel like *that*?”

- **Companion (methods + evidence)**: `analysis/ANALYSIS_FEATURE_TABLE.md` (includes extended cross-tabs under “Further table-derived analyses”)
- **Data**: `analysis/features.json` (manual enums + notes, 58 companies)
- **Extra context**: LightRAG knowledge graph (KG) extracted from design-system source material

### Why this exists (design systems aren’t just UI)

Design systems are often treated as “components + tokens.” But the most valuable systems also encode **rationale**: how a brand wants to feel, what trade-offs it chose, and what it refuses to do.

This analysis exists to get a glimpse of that rationale across many companies — not to judge “best design,” but to extract a shared vocabulary for the kinds of decisions design systems document (and the patterns those decisions correlate with).

### How to read this

- **This doc** is the *story*: the most stable, re-usable insights.
- The companion doc is the *proof + definitions*: distributions, cross-tabs, limitations, and traceability.

### Evidence model (so claims stay honest)

Each insight uses one or more evidence types:

- **[Table]**: supported by `analysis/features.json` distributions / cross-tabs (see companion).
- **[KG]**: supported by quoted design-system/KG snippets (not always uniformly available per company).
- **[Hypothesis]**: plausible explanation for a pattern; not directly proven by the table.

### Scope and non-goals

- **Scope**: marketing sites + public-facing design system docs, summarized as a feature table and light KG evidence.
- **Non-goals**: ranking quality, prescribing “best” aesthetics, or claiming causality (these are correlations).

---

### 1) Physical product companies use photography as their primary interface layer

**Companies: Apple; automotive OEMs in the dataset (BMW, Ferrari, Lamborghini, Renault, Tesla)**

Physical product companies treat the product photograph (and, on some automotive sites, full-viewport video) not as decoration but as the primary communicative element of the interface. Layout systems are built around the vehicle or device — full-width hero photography, content centered below the image, spacing that gives the product room to breathe. The grid exists to frame the product, not the other way around.

This is distinct from consumer marketplaces (Airbnb, Pinterest), which also use photography heavily but as *content* — listings, pins, things to browse. Physical product imagery is singular and curated; marketplace photography is plural and user-generated.

> *[Apple → Layout Principles] "full-width hero photography, centered content sections"*
> *[Apple → Apple's Website] "product-as-hero photography, proprietary typography, centered full-width layouts"*
> *[BMW → Image Treatment] "brand imagery, automotive aesthetic, visual identity, photography"*

**What this achieves:** The product becomes the argument. No copy needed to establish desirability — the photograph (or cinematic hero) makes the case. Typography's job is to annotate, not to persuade.

- **Evidence**:
  - **[Table]**: `productType=physical` is now six rows; most use `contentFocus=photography`, with Lamborghini tagged `mixed` to reflect video-led heroes plus stills (see companion).
  - **[KG]**: Apple/BMW snippets above; other OEMs are documented similarly in their `DESIGN.md` files.

---

### 2) Physical product companies treat custom typefaces as hardware assets, not software choices

**Companies: Apple (San Francisco); BMW, Ferrari, Lamborghini, Renault, Tesla (each with proprietary or custom-tuned families in their `DESIGN.md`)**

Apple and the automotive OEMs in this collection lean heavily on proprietary or brand-exclusive type (e.g. BMWTypeNextLatin, FerrariSans, LamboType, NouvelR, Universal Sans). This is not just about aesthetics — it is vertical integration of brand identity. A proprietary typeface cannot be used by a competitor, and it creates a “visual monopoly” on a specific feeling.

Notably, these families are engineered for legibility at small sizes on screen *and* in physical or in-vehicle contexts where relevant. The design brief was not only "look distinctive" — it was "work everywhere we exist."

> *[Apple → San Francisco] "San Francisco is Apple's proprietary typeface family referenced as the typographic foundation of the design system"*

**What this achieves:** Brand consistency across touchpoints that no shared font can achieve. If someone sees that letterform, they know who made it. The typeface is a trademark.

- **Evidence**:
  - **[KG]**: Apple SF reference above; OEM type systems are spelled out in each brand’s `DESIGN.md`.
  - **[Hypothesis]**: “hardware-asset” framing explains why commissioning is common in physical brands.

---

### 3) Fintech companies use flat design as a trust signal, not a style choice

**Companies: Coinbase, Revolut, Wise**

All three fintech companies lean toward flat or near-flat surface design — minimal shadows, low elevation contrast, clean card borders without heavy layering. This reads as a deliberate counter to the depth and drama that physical product companies and AI companies use.

The logic: shadows and depth can imply complexity, layering, and hidden structure. Fintech products often need to project transparency. A flat interface says “there is nothing behind this card you are not seeing.”

Revolut is explicit about this: cards use "flat styling, no shadows" across both dark and light sections.

> *[Revolut → Cards & Containers] "rounded rectangular surfaces with flat styling, no shadows"*
> *[Coinbase → Depth & Elevation] "flatness, overlays, borders, and minimal shadow usage"*

**What this achieves:** Visual simplicity as a proxy for operational simplicity. This is especially important for products where users are anxious about where their money is and what is happening to it.

- **Evidence**:
  - **[Table]**: `fintechAndCrypto` is a defined bucket (4 companies: Coinbase, Kraken, Revolut, Wise; Stripe is under Infrastructure); see companion segment summaries and “big levers.”
  - **[KG]**: Revolut/Coinbase snippets above.
  - **[Hypothesis]**: flatness → perceived transparency (interpretation, not a measured outcome).

---

### 4) Fintech companies invest disproportionately in custom typography as their primary differentiator

**Companies: Coinbase, Wise**

Coinbase has not one but four proprietary fonts: CoinbaseDisplay, CoinbaseSans, CoinbaseText, and CoinbaseIcons. Each is purpose-built for a specific role. Wise has Wise Sans. These companies have minimal color palettes (1-2 brand colors, mostly neutrals) and flat surfaces — so typography becomes the primary carrier of brand character.

When you cannot differentiate through color drama or visual complexity, you differentiate through the specific quality of your letterforms.

> *[Coinbase → CoinbaseDisplay] "proprietary display font used for hero headlines, sub-hero text, and other high-impact display typography"*
> *[Coinbase → CoinbaseSans] "proprietary font family used for buttons, headings, navigation, captions, tags, and emphasized body text"*
> *[Wise → Wise Sans] "brand identity, typography, design system"*

**What this achieves:** Memorability without visual noise. You remember the Coinbase interface as feeling a certain way — that feeling is entirely typographic.

- **Evidence**:
  - **[KG]**: Coinbase + Wise type references above.
  - **[Hypothesis]**: when palettes/surfaces are constrained, typography becomes the differentiator.

---

### 5) Developer tools use near-monochrome palettes as a credibility signal

**Companies: Vercel, Linear, Cursor, Raycast, Sentry**

Developer tool companies consistently gravitate toward black, white, and one sharp accent — typically a bright blue, green, or electric color used only for interactive states and highlights. The rest of the palette is near-monochrome.

This is not minimalism for its own sake. It is mimicry of the terminal and the IDE — the environments where developers spend most of their time. A dark monochrome interface says "this is a serious tool, not a consumer product." Color would read as frivolous.

> *[Vercel → Whitespace Philosophy] "dark void as canvas, dense information presentation, and neon highlights as navigational cues"*
> *[Vercel → Layout Principles] "showroom-like experience while remaining information-dense"*

**What this achieves:** Immediate context-setting. A developer opening a new tool reads the color scheme before reading any copy. Monochrome + neon says "professional, technical, no hand-holding."

- **Evidence**:
  - **[Table]**: Developer Tools & Platforms (`developerToolsAndPlatforms`) shows mixed `themeMode` but a meaningful dark-first share (see companion cross-tabs).
  - **[KG]**: Vercel snippets above.
  - **[Hypothesis]**: “IDE/terminal mimicry” as credibility.

---

### 6) Developer tools use monospace fonts as identity, not just utility

**Companies: Vercel (Geist Mono), Raycast, Cursor**

Multiple dev tool companies have adopted or commissioned monospace typefaces as their primary or signature brand font — not just for code blocks, but for navigation links, UI labels, and marketing copy. This is a relatively recent and specific pattern.

The monospace font as an identity choice signals: "we are built by and for technical people." It is the typographic equivalent of showing your source code. It also solves a practical problem: interfaces that display variable amounts of code and prose need a font that works at both.

> *[Vercel → Navigation] "monospace links, underline decoration, and a solid surface"*
> *[Vercel → Geist Mono] "brand typography, developer tooling, product identity"*

**What this achieves:** Instant recognition within the developer community. When Vercel uses Geist Mono in their marketing, it reads as authenticity — they actually use the thing they make.

- **Evidence**:
  - **[KG]**: Vercel Geist Mono + navigation snippet above.
  - **[Hypothesis]**: monospace as “show your work” identity.

---

### 7) AI product companies often use dark surfaces as an aesthetic claim about intelligence

**Companies: ElevenLabs, XAI, Cohere, Together AI**

AI product companies frequently use dark-mode-forward interfaces — dark backgrounds, light text, minimal color beyond a single accent — but the feature table suggests the segment is mixed rather than uniform.

The hypothesis: dark interfaces connote depth, complexity, and “machine-ness.” They distinguish AI tools from light-mode productivity incumbents. They also read well in demo videos and screen recordings, which matters for a demo-heavy category.

> *[ElevenLabs → Layout Principles] "dark-page composition, whitespace philosophy"*
> *[XAI → Design System] visual identity centered on dark surfaces with high contrast*

**What this achieves:** Positioning through aesthetics. Before you know what the product does, you know it is not a conventional SaaS tool. Dark + typography-heavy says "this is something new."

- **Evidence**:
  - **[Table]**: AI segment is genuinely mixed on theme mode and intent; “dark-first by default” is not uniform (see companion “AI is the split segment” + theme-mode cross-tab).
  - **[KG]**: ElevenLabs/xAI references above.
  - **[Hypothesis]**: dark = intelligence/complexity positioning.

---

### 8) Code-first payload locks into trust

Across the dataset, the *content payload* is one of the cleanest predictors of perceived intent. The strongest single rule is: when a page is **code-first**, it is almost always making a **trust** play.

**What this achieves:** Credibility-by-payload. Showing code is a kind of proof: it reduces ambiguity and tends to read as concrete, technical, and inspectable.

- **Evidence**:
  - **[Table]**: `contentFocus=codeFirst` maps to `primaryIntent=trust` **13/13** in the current table (58 companies).

---

### 9) Illustration and photography create room for exploration and emotional branding

When a page leans on **illustration** or **photography**, the intent distribution becomes mixed — these payloads are more compatible with **exploration** (browse/discover) and **emotional branding** (world-building) than code-first pages are.

**What this achieves:** Permission to be experiential. “World” payloads can carry taste, mood, and narrative without needing to look like a spec sheet.

- **Evidence**:
  - **[Table]**: `contentFocus=illustration` is intent-mixed (trust 4 / exploration 3 / emotionalBranding 2).
  - **[Table]**: `contentFocus=photography` is intent-mixed (trust 3 / exploration 3 / emotionalBranding 4) — automotive rows increased the photography slice.

---

### 10) Productivity/SaaS companies have the thinnest design systems — and this might be strategic

**Companies: Notion, Airtable, Miro, Framer, Webflow**

Compared to every other category, productivity companies show significantly lower signal density across almost every design dimension — fewer custom typography signals, less developed color systems, lower motion/animation investment, lower photography investment. Notion's most distinctive design choice is warm-toned ring shadows over conventional drop shadows.

This could be evidence of less design investment. But it could also be deliberate: productivity tools need to *disappear*. The interface should not have a strong aesthetic identity because it competes with the user's content. The whiteboard (Miro), the document (Notion), the database (Airtable) should feel neutral so that whatever the user creates in it feels like *theirs*.

> *[Notion → Shadow Philosophy] "warm-toned ring shadows over conventional drop shadows, subtle soft lifts"*

**What this achieves:** Interface neutrality as a product feature. When the tool has no strong aesthetic, the user's work fills the visual space. This is especially important for tools where users share and publish their output — you want Notion pages to look like the user's brand, not Notion's brand.

- **Evidence**:
  - **[KG]**: Notion shadow philosophy snippet above.
  - **[Hypothesis]**: “disappearing interface” as a strategic choice (needs stronger, table-backed operationalization to be treated as [Table]).

---

### 11) The “do’s and don’ts” section correlates with brand rigidity requirements

**Companies with prominent Do's/Don'ts sections: Apple, BMW (and other OEM `DESIGN.md` files), Vercel, Cursor, Revolut**

Companies with highly controlled, premium, or compliance-sensitive brand identities all explicitly document what you cannot do with their design system. This pattern is absent from developer tools that encourage forking and customization (Linear, Sentry), and from productivity tools where user customization is the point.

The presence of a Do's/Don'ts section is a signal about who the design system audience is: internal teams and external partners who need hard constraints, not suggestions. Automotive and consumer electronics brands need to control how their identity appears in third-party contexts. Revolut needs to prevent rogue implementations.

> *[BMW → Do's and Don'ts] "brand rules, identity, constraints, governance"*
> *[Apple → Do's and Don'ts] "design rules, implementation guidance, brand consistency"*

---

### 12) Most sites in the table read as browsing-heavy marketing, not task shells

Even when the product is a developer tool, database, or model API, the **labeled UX mode** skews toward **browsing-heavy** layouts: long scroll, hero + sections, grids of cards—more showroom than application chrome.

**What this achieves:** a comparable “genre” across categories: the first touch is usually discovery and narrative, not dense workflow UI (which would show up more as `taskFocused` or `creationTool`).

- **Evidence**:
  - **[Table]**: `uxMode=browsingHeavy` is **25/58**; `taskFocused` **12/58**; `creationTool` **6/58** (see companion “Further table-derived analyses §A”).
  - **[Hypothesis]**: the feature table is biased toward **public marketing** pages rather than signed-in product surfaces.

---

### 13) “Flat dark” shows up across unrelated buckets

A non-trivial subset of companies pair **dark-first** surfaces with **no** emphasized shadow system (`shadowStyle=none`). The set mixes AI, dev tooling, fintech, CMS, and automotive—suggesting a **shared flat-dark canvas** tactic (depth from type, color, or imagery—not stacked elevation).

- **Evidence**:
  - **[Table]**: `themeMode=darkFirst` ∧ `shadowStyle=none` → **10/58** (companion §G lists slugs).
  - **[Hypothesis]**: psychological “premium terminal” or “cinematic void” readings depend on category context; the table only shows co-occurrence.

---

### 14) Gradient-led color is rare and not owned by one collection

Only **seven** rows use `colorStrategy=gradientLed`, and they span **Design & Productivity**, **Developer Tools**, **AI**, and **Automotive**. Gradients here function as a **brand or hero accent strategy**, not as a marker of a single README section.

- **Evidence**:
  - **[Table]**: seven named companies in companion “Further table-derived analyses §F.”
  - **[Hypothesis]**: *why* a team chooses gradients (energy, futurism, aurora heroes) is category-specific even when the enum is the same.

---

### 15) Design craft signals the knowledge graph surfaces (beyond the feature table)

The LightRAG graph aggregates many `DESIGN.md` chunks into shared entities. That merging is lossy for attribution (see §16), but it also makes **repeated craft decisions** visible: the same *kinds* of sections and micro-rules show up again and again across unrelated companies.

**A convergent outline for “public marketing site” specs.** Distinct documents independently elevate the same *document architecture*: **Touch Targets** (minimum tap sizes, full-width mobile CTAs, spacing for links and pills), **Collapsing Strategy** (how hero, nav, grids, and colorful sections compress across breakpoints), **Image Behavior** (lazy loading, full-bleed heroes, preserving corner radius when scaling), and **Breakpoints** as a named responsive framework. That pattern is stronger in the KG than ad-hoc component catalogs—it reads like an emerging **Stitch-style checklist** for agent-ready marketing pages, not only a visual style guide.

> *[KG → Touch Targets] "minimum tappable dimensions and spacing … CTAs, navigation links, media controls, and pill buttons"*
> *[KG → Collapsing Strategy] "how headlines, grids, navigation, hero modules, section backgrounds, and images adapt across screen sizes"*

**Several incompatible “depth grammars,” all explicit.** Merged **Shadow Philosophy** / **Depth & Elevation** descriptions encode genuinely different strategies: **almost no shadows**—depth from borders, opacity shifts, and photography (e.g. Warp’s marketing framing in the graph); **void-black canvases** where conventional drop shadows read wrong, so **frost or ring borders** imply lift; **warm ring halos** and **multi-layer card shadows** for tactile marketplaces; **flat planes + overlays** for trust-forward fintech (aligned with §3). The graph’s pile of contradictions is the insight: teams are not “choosing shadow vs flat” at random—they are picking **which physics metaphor** matches their background (white gallery, black void, terminal dense).

> *[KG → Shadow Philosophy] "almost no shadows, instead relying on borders, opacity shifts, and photography to create depth"*
> *[KG → Shadow Philosophy] "traditional shadows are ineffective on a pure black background … frost borders … floating glass-like depth"*
> *[KG → Depth & Elevation] "elevation should remain minimal and rely on ring shadows and pastel surface contrast rather than heavy shadows"*

**Micro-typography and interaction details are named principles, not afterthoughts.** The graph repeatedly extracts **Negative Tracking on Headings** as its own rule—tight letter-spacing for an “intimate” display voice. **Variable Font Precision** appears as a principle: continuous interpolation exists, but the *system* commits to **discrete weight stops** so implementation stays predictable. **Tab Navigation** is documented down to mechanism—e.g. **active state via inset box-shadow underlines** rather than a bottom border—showing how far teams go to keep chrome visually quiet.

> *[KG → Negative Tracking on Headings] "slightly negative letter spacing on headings to create an intimate and cozy tone"*
> *[KG → Variable Font Precision] "continuous interpolation while the system uses discrete weight stops"*
> *[KG → Tab Navigation] "active or hover states expressed via inset box-shadow underlines rather than border-bottom"*

**Perceptual color spaces show up in prose tokens.** Descriptions cite **oklab**-based borders and low-opacity “warm brown” neutrals—borders defined for **perceptual consistency across backgrounds**, not just hex pairs. That is a design insight for cross-functional teams: the spec is written so **engineering’s color space** and **design’s “organic edge”** are the same sentence.

> *[KG → Border Primary] "standard border … 10% warm brown in oklab space"*
> *[KG → Tab Navigation] "bottom border of 1px solid oklab(0.263 / 0.1)"*

**Dual-register typography on technical brands.** The merged graph often pairs a **monospace / code** role (e.g. Geist Mono, commitMono) with a separate **editorial or display** role—e.g. **GT Alpina** for “editorial moments,” or principle text that contrasts **serif authority** with **sans utility**. The pattern is a **magazine voice + terminal voice** on the same surface: credibility through monospace, warmth or sophistication through a second family used sparingly.

> *[KG → Editorial] "GT Alpina for selective editorial moments requiring warmth and elegance"*
> *[KG → Principles] "serif authority, sans utility, and readability choices"*

**“Whitespace” is framed as pacing, not emptiness.** **Whitespace Philosophy** nodes describe **photography as whitespace**, **chapter-like** section breaks, **content islands** on void backgrounds, and contrast between dense and sparse bands. That matches the table’s browsing-heavy marketing skew (§12) but adds *rhetoric*: negative space is doing **narrative rhythm**, not just layout grid math.

> *[KG → Whitespace Philosophy] "generous spacing … photography as visual whitespace, and editorial pacing"*
> *[KG → Whitespace Philosophy] "chapter-like section separation … readability"*

- **Evidence**:
  - **[KG]**: entity descriptions and hubs above in `design-md-kg/graph_data.json` (and the GraphML export); relationship keywords skew heavily toward typography, responsive layout, and tokens (§16).
  - **[Table]**: complements `shadowStyle`, `themeMode`, and `uxMode` enums—graph text explains *how* teams justify those choices in long-form specs.
  - **[Hypothesis]**: shared section names reflect **awesome-design-md / Stitch norms** and mutual imitation as much as independent convergence.

---

### 16) The LightRAG graph is a distorted lens—useful if you read its seams

The chunk–entity–relation graph in `design-md-kg/graph_chunk_entity_relation.graphml` (mirrored in `design-md-kg/graph_data.json`, ~2k nodes) was built for retrieval, not as a clean ontology. Several **non-obvious** behaviors show up only when you scan the merged graph—not when you read a single company’s `DESIGN.md`.

**Entity types are extraction artifacts, not a semantic schema.** The extractor had a small set of labels (mostly ORGANIZATION, EVENT, LOCATION). In practice, **named colors** can appear as LOCATION when the prose ties them to a street-address origin story; **font families** sometimes appear as ORGANIZATION; **document sections** (“Breakpoints”, “Decorative Depth”) appear as EVENT; **screen regions** (hero, category pill bar) appear as LOCATION. Treat `entity_type` as bookkeeping from the NER pass, not as “what this thing is” in a design information model.

**Brand narrative and automated audit text are fused in the same node descriptions.** The Airbnb organization node’s description repeatedly embeds **“61 detected breakpoints”** next to marketing language—that pattern comes from **layout-analysis output** being summarized into the same entity string as hand-written spec tone. A generic **“Breakpoints”** hub node similarly carries a variant mentioning **“26 detected breakpoints.”** The graph does **not** separate provenance: measurement-like claims and normative rules sit in one blob. For agents, that is a **QA risk** if quoted as author intent without chunk traceability.

**“Agent Prompt Guide” is a first-class hub, not a footnote.** The graph includes an explicit **Agent Prompt Guide** entity whose merged descriptions reference structured prompting, color references, component examples, and iteration rules—spanning multiple companies’ docs (including Apple- and Airbnb-aligned wording in the same aggregated node). That matches the Stitch-style idea that **LLM-facing instructions are structural peers of tokens and type**, not an appendix.

**Generic names collapse many brands into synthetic archetypes.** Nodes such as **Hero Section**, **Breakpoints**, and **Decorative Depth** accumulate **dozens of incompatible descriptions** from different sites (e.g. one hero on pure white with a given display font, another on a loud gradient, another on void black). The graph then behaves as if there were a single cross-industry object. That is good for noticing **genre conventions** (“everyone documents a hero and a breakpoint table”) and poor for **attribution** unless you follow `source_id` / chunk IDs back to one `DESIGN.md`.

**Relationship vocabulary skews toward typography and responsive scaffolding.** Aggregated edge keywords emphasize typography roles, hierarchy, font stacks, brand identity, responsive layout, and color tokens—**not** motion systems, illustration pipelines, or content workflows. The KG over-represents **how rules are named and wired** relative to other design dimensions; absence in the graph is not evidence of absence in the product.

**Sub-brand tiers show up as dense parallel entity clusters.** Marketplace-style specs spawn sibling nodes for offerings and their colors (e.g. premium tiers and **magenta / purple** accents). In edge count and description volume, **brand architecture** can look as “heavy” as **component anatomy**—a niche signal that some `DESIGN.md` files are doing as much **SKU- and tier-story work** as UI pattern work.

**PERSON is rare and mixed.** Only a handful of PERSON nodes appear across the whole graph; they include real names, role buckets, mascots, and invoked taste references (e.g. **Dieter Rams**). The type is **not** a reliable people index—it marks **where the prose personifies or cites humans**.

- **Evidence**:
  - **[KG]**: entity-type distribution and merged descriptions in `design-md-kg/graph_data.json` / `graph_chunk_entity_relation.graphml`; hub entities **Agent Prompt Guide**, **Breakpoints**, **Hero Section**, **Decorative Depth** (cross-brand description stacks); Airbnb node text citing detected breakpoint counts.
  - **[Hypothesis]**: collapsing entities improves recall for RAG but **blurs brand-specific claims**; consumers should prefer chunk-grounded answers over raw node summaries.

---

### Summary: a few “big levers” explain most first impressions

If you want a fast, re-usable vocabulary that works for both designers and engineers, start with these levers (all captured in the feature table):

- **Mood**: `themeMode` (light-first vs dark-first vs dual)
- **Geometry**: `shapeLanguage` (sharp vs rounded vs pill vs mixed)
- **Depth language**: `shadowStyle` (none/subtle vs stacked vs ring)
- **Payload**: `contentFocus` (code vs product screenshots vs photography vs illustration)

For distributions, segment cross-tabs, and a claim-by-claim traceability index, see `analysis/ANALYSIS_FEATURE_TABLE.md`.

### Segment cheat-sheet (high-level)

| Category | Typography | Color | Surface | Primary differentiator |
|----------|-----------|-------|---------|----------------------|
| Physical product / OEM | Custom/proprietary | Minimal, neutral + brand accent | Photography-first (often dual or dark-first for cars) | Product imagery as argument |
| Consumer marketplace | Custom | Rich token system, sub-brand colors | Card-heavy, layered elevation | Sub-brand color architecture |
| Fintech | Custom (typography-led) | 1-2 brand colors, neutral everything else | Flat, border-defined | Typography + flatness = trust |
| Developer tools | Monospace as identity | Near-monochrome + neon accent | Dark, information-dense | Monochrome + density = credibility |
| AI product | Display-heavy | Dark, minimal, 1 accent | Dark surfaces, light type | Dark + typography = intelligence |
| Design & productivity | System fonts or near-neutral | Moderate, user-content-friendly | Light, neutral, minimal shadow | Disappearing interface |
| Automotive (OEM) | Proprietary sans families | Single / multi / gradient heroes | Dual or dark-first, often flat or stacked | Product + brand theater |