const FEATURES_URL = '../analysis/features.json'

/** Raw DESIGN.md on GitHub (awesome-design-md) */
const DESIGN_MD_GITHUB_BLOB_BASE =
  'https://github.com/VoltAgent/awesome-design-md/blob/main/'

function designMdGithubBlobUrl (designMdPath) {
  const p = String(designMdPath || '').trim().replace(/^\/+/, '')
  if (!p) return ''
  return DESIGN_MD_GITHUB_BLOB_BASE + encodeURI(p)
}

const INTENT_BUCKET = {
  trust: 'trust',
  exploration: 'exploration',
  emotionalBranding: 'emotional',
  speed: 'exploration',
  conversion: 'emotional',
  unknown: 'unknown'
}

const SELECT_KEYS = [
  'businessModel',
  'themeMode',
  'layoutDensity',
  'contentFocus'
]

const ENUM_FIX = {
  saas: 'SaaS',
  ai: 'AI',
  api: 'API',
  devtools: 'Dev tools',
  fintech: 'Fintech',
  ecommerce: 'E-commerce',
  unknown: 'Not specified'
}

const FEATURE_SHORT_LABEL = {
  businessModel: 'Company',
  uxMode: 'UX style',
  themeMode: 'Theme',
  layoutDensity: 'Density',
  shadowStyle: 'Depth',
  contentFocus: 'On-screen',
  primaryIntent: 'Focus'
}

const INTENT_READABLE = {
  trust: 'trust & clarity',
  exploration: 'browsing & discovery',
  speed: 'speed & efficiency',
  conversion: 'conversion',
  emotionalBranding: 'brand & emotion',
  unknown: 'mixed'
}

function prettyEnumValue (v) {
  if (!v) return ''
  if (ENUM_FIX[v]) return ENUM_FIX[v]
  return v
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[\s_]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function prettyPrimaryIntent (v) {
  return INTENT_READABLE[v] || prettyEnumValue(v)
}

const previewCache = new Map()
const previewInFlight = new Map()

function clamp (n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function toNumber (v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function normalizeWeights (wHard, wVibe, wText) {
  const sum = wHard + wVibe + wText
  if (sum <= 0) return { wHard: 0.7, wVibe: 0.2, wText: 0.1 }
  return {
    wHard: wHard / sum,
    wVibe: wVibe / sum,
    wText: wText / sum
  }
}

function normalizeIntentWeights (trust, exploration, emotional) {
  const t = clamp(toNumber(trust, 0), 0, 100)
  const e = clamp(toNumber(exploration, 0), 0, 100)
  const m = clamp(toNumber(emotional, 0), 0, 100)
  const sum = t + e + m
  if (sum <= 0) return { trust: 1 / 3, exploration: 1 / 3, emotional: 1 / 3 }
  return { trust: t / sum, exploration: e / sum, emotional: m / sum }
}

function escapeHtml (s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function computeHardMatch (rowFeatures, selected) {
  const keys = Object.keys(selected)
  if (keys.length === 0) return { score: 1, matches: [], misses: [] }

  const matches = []
  const misses = []

  for (const key of keys) {
    const desired = selected[key]
    if (!desired || desired === 'any') continue

    const actual = rowFeatures?.[key] ?? 'unknown'
    if (actual === desired) matches.push({ key, actual })
    else misses.push({ key, desired, actual })
  }

  const denom = matches.length + misses.length
  if (denom === 0) return { score: 1, matches, misses }
  return { score: matches.length / denom, matches, misses }
}

function computeIntentMatch (primaryIntent, intentWeights) {
  const bucket = INTENT_BUCKET[primaryIntent] ?? 'unknown'
  if (bucket === 'unknown') return (intentWeights.trust + intentWeights.exploration + intentWeights.emotional) / 3
  return intentWeights[bucket] ?? 0
}

function computeTextMatch (query, row) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return 0

  const hay = [
    row?.company?.name,
    row?.company?.slug,
    row?.source?.designMdPath,
    row?.notes
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase()

  const terms = q.split(/\s+/).filter(Boolean).slice(0, 8)
  if (terms.length === 0) return 0

  let hits = 0
  for (const t of terms) {
    if (hay.includes(t)) hits += 1
  }
  return hits / terms.length
}

function buildSelectedFilters (state) {
  const selected = {}
  for (const key of SELECT_KEYS) {
    const v = state[key]
    if (!v || v === 'any') continue
    selected[key] = v
  }
  return selected
}

function uniqSorted (values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)))
}

function sortFilterOptions (options, preferredOrder) {
  const orderMap = new Map((preferredOrder || []).map((v, i) => [v, i]))
  return options.slice().sort((a, b) => {
    const ai = orderMap.has(a) ? orderMap.get(a) : 10_000
    const bi = orderMap.has(b) ? orderMap.get(b) : 10_000
    if (ai !== bi) return ai - bi
    return String(a).localeCompare(String(b))
  })
}

function syncCustomSelectDisplay (root) {
  if (!root) return
  const input = root.querySelector('input[type="hidden"]')
  const valueSpan = root.querySelector('.customSelectValue')
  const menu = root.querySelector('[role="listbox"]')
  if (!input || !valueSpan || !menu) return
  const v = input.value
  const opts = Array.from(menu.querySelectorAll('.customSelectOption'))
  const match = opts.find((el) => el.getAttribute('data-value') === v)
  valueSpan.textContent = match
    ? match.textContent
    : (v === 'any' ? 'Any' : prettyEnumValue(v))
  opts.forEach((el) => {
    const on = el.getAttribute('data-value') === v
    el.setAttribute('aria-selected', on ? 'true' : 'false')
    el.classList.toggle('customSelectOption--active', on)
  })
}

function syncAllFilterSelectDisplays () {
  for (const key of SELECT_KEYS) {
    const root = document.querySelector(`[data-custom-select="${key}"]`)
    syncCustomSelectDisplay(root)
  }
}

function populateCustomFilter ({ inputEl, options, preferredOrder }) {
  const id = inputEl?.id
  if (!id) return
  const root = document.querySelector(`[data-custom-select="${id}"]`)
  if (!root) return
  const menu = root.querySelector('[role="listbox"]')
  if (!menu) return
  const sorted = sortFilterOptions(options, preferredOrder)
  menu.innerHTML = ''
  const rows = [{ value: 'any', label: 'Any' }, ...sorted.map((value) => ({
    value,
    label: prettyEnumValue(value)
  }))]
  for (const { value, label } of rows) {
    const li = document.createElement('li')
    li.setAttribute('role', 'option')
    li.setAttribute('data-value', value)
    li.setAttribute('tabindex', '-1')
    li.className = 'customSelectOption'
    li.textContent = label
    menu.appendChild(li)
  }
  syncCustomSelectDisplay(root)
}

let customSelectOpenRoot = null

function closeCustomSelectMenu () {
  if (!customSelectOpenRoot) return
  const trigger = customSelectOpenRoot.querySelector('.customSelectTrigger')
  const menu = customSelectOpenRoot.querySelector('[role="listbox"]')
  if (menu) menu.hidden = true
  if (trigger) trigger.setAttribute('aria-expanded', 'false')
  customSelectOpenRoot.classList.remove('customSelect--open')
  customSelectOpenRoot = null
}

function openCustomSelectMenu (root) {
  closeCustomSelectMenu()
  const trigger = root.querySelector('.customSelectTrigger')
  const menu = root.querySelector('[role="listbox"]')
  if (!trigger || !menu) return
  customSelectOpenRoot = root
  menu.hidden = false
  trigger.setAttribute('aria-expanded', 'true')
  root.classList.add('customSelect--open')
}

function chooseCustomSelectValue (root, value, onChange) {
  const input = root.querySelector('input[type="hidden"]')
  if (!input) return
  input.value = value
  syncCustomSelectDisplay(root)
  closeCustomSelectMenu()
  onChange()
}

function attachCustomFilterHandlers (panelEl, onChange) {
  if (!panelEl) return

  panelEl.addEventListener('click', (e) => {
    const inside = e.target.closest('.customSelect')
    if (inside) e.stopPropagation()

    const option = e.target.closest('.customSelectOption')
    const rootOpt = e.target.closest('.customSelect')
    if (option && rootOpt) {
      chooseCustomSelectValue(rootOpt, option.getAttribute('data-value') || 'any', onChange)
      rootOpt.querySelector('.customSelectTrigger')?.focus()
      return
    }

    const trigger = e.target.closest('.customSelectTrigger')
    const root = e.target.closest('.customSelect')
    if (trigger && root) {
      if (customSelectOpenRoot === root) {
        closeCustomSelectMenu()
        return
      }
      openCustomSelectMenu(root)
    }
  })

  document.addEventListener('click', () => closeCustomSelectMenu())

  panelEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (customSelectOpenRoot) {
        const t = customSelectOpenRoot.querySelector('.customSelectTrigger')
        closeCustomSelectMenu()
        t?.focus()
      }
      return
    }

    if (e.key === 'Tab' && customSelectOpenRoot) {
      closeCustomSelectMenu()
      return
    }

    const root = e.target.closest('.customSelect')
    if (!root) return

    const menu = root.querySelector('[role="listbox"]')
    const trigger = root.querySelector('.customSelectTrigger')
    const isOpen = customSelectOpenRoot === root
    const opts = () => Array.from(menu.querySelectorAll('.customSelectOption'))

    if (e.target === trigger) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (!isOpen) openCustomSelectMenu(root)
        const list = opts()
        const i = e.key === 'ArrowDown' ? 0 : list.length - 1
        list[i]?.focus()
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (isOpen) closeCustomSelectMenu()
        else openCustomSelectMenu(root)
      }
      return
    }

    if (e.target.classList?.contains('customSelectOption')) {
      const list = opts()
      const i = list.indexOf(e.target)
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        list[Math.min(i + 1, list.length - 1)]?.focus()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        list[Math.max(i - 1, 0)]?.focus()
      } else if (e.key === 'Home') {
        e.preventDefault()
        list[0]?.focus()
      } else if (e.key === 'End') {
        e.preventDefault()
        list[list.length - 1]?.focus()
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        chooseCustomSelectValue(root, e.target.getAttribute('data-value') || 'any', onChange)
        trigger?.focus()
      }
    }
  })
}

function pickTags (rowFeatures) {
  const keys = ['businessModel', 'uxMode', 'themeMode', 'layoutDensity', 'shadowStyle', 'contentFocus', 'primaryIntent']
  const out = []
  for (const k of keys) {
    const v = rowFeatures?.[k]
    if (!v || v === 'unknown') continue
    const label = FEATURE_SHORT_LABEL[k] || k
    const shown = k === 'primaryIntent' ? prettyPrimaryIntent(v) : prettyEnumValue(v)
    out.push(`${label}: ${shown}`)
  }
  return out.slice(0, 3)
}

function guessSlugFromRow (row) {
  const slug = row?.company?.slug
  if (slug) return slug
  const p = row?.source?.designMdPath || ''
  const m = p.match(/^design-md\/([^/]+)\//)
  return m?.[1] || ''
}

function buildPreviewLink (slug, file) {
  const safeSlug = encodeURIComponent(slug)
  const safeFile = encodeURIComponent(file)
  return `../design-md/${safeSlug}/${safeFile}`
}

function pickLightDarkPreviews (files) {
  if (!files || files.length === 0) return { light: '', dark: '', hasBoth: false }
  const darkFile = files.find(f => /dark/i.test(f))
  const lightFile = files.find(f => /^preview\.html$/i.test(f))
    || files.find(f => !/dark/i.test(f))
  const first = files[0]
  const light = lightFile || first
  const dark = darkFile || light
  const hasBoth = Boolean(darkFile && lightFile && darkFile !== lightFile)
  return { light, dark, hasBoth }
}

const EXTERNAL_ICON_SVG = `<svg class="externalIcon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5M16.5 3h6m0 0v6m0-6L10.5 17.25" /></svg>`

function parseDirectoryListingForPreviews (html) {
  const matches = []
  const re = /href="([^"]+)"/g
  let m
  while ((m = re.exec(html))) {
    const href = m[1]
    if (!href) continue
    if (href === '../' || href === './' || href.startsWith('?')) continue
    let decoded = href
    try {
      decoded = decodeURIComponent(href)
    } catch {}
    decoded = decoded.replaceAll('%20', ' ')
    if (!/^preview.*\.html$/i.test(decoded)) continue
    matches.push(decoded)
  }
  return Array.from(new Set(matches)).sort((a, b) => a.localeCompare(b))
}

async function discoverPreviews (slug) {
  if (!slug) return []
  if (previewCache.has(slug)) return previewCache.get(slug)
  if (previewInFlight.has(slug)) return previewInFlight.get(slug)

  const p = (async () => {
    try {
      const res = await fetch(`../design-md/${encodeURIComponent(slug)}/`, { cache: 'no-store' })
      if (!res.ok) return []
      const html = await res.text()
      const previews = parseDirectoryListingForPreviews(html)
      previewCache.set(slug, previews)
      return previews
    } catch {
      return []
    } finally {
      previewInFlight.delete(slug)
    }
  })()

  previewInFlight.set(slug, p)
  return p
}

function buildScoreTooltip (score, parts, primaryIntentReadable) {
  const total = (score * 100).toFixed(0)
  const filterPct = (parts.hard.score * 100).toFixed(0)
  const goalPct = (parts.intent * 100).toFixed(0)
  const keywordPct = (parts.text * 100).toFixed(0)
  return (
    `Match score ${total} (0–100). Higher = closer to what you asked for. ` +
    `Weighted mix: 70% filter overlap (${filterPct}% on this row), ` +
    `20% goal fit (${goalPct}%; this system’s focus: ${primaryIntentReadable}), ` +
    `10% search keywords (${keywordPct}% overlap with your search). ` +
    `For ordering only—not a grade of design quality.`
  )
}

function renderCard ({ row, score, parts, selected }) {
  const name = row?.company?.name || row?.company?.slug || 'Unknown'
  const slug = row?.company?.slug || ''
  const path = row?.source?.designMdPath || ''
  const f = row?.features || {}
  const notes = row?.notes || ''
  const notesId = `notes-${escapeHtml(guessSlugFromRow(row) || String(Math.random()).slice(2))}`
  const scoreTipId = `stip-${String(Math.random()).toString(36).slice(2, 11)}`

  const matchBits = []
  for (const m of parts.hard.matches) {
    matchBits.push(`<strong>${escapeHtml(m.key)}</strong> = ${escapeHtml(m.actual)}`)
  }
  for (const key of Object.keys(selected)) {
    const hasAnyMatch = parts.hard.matches.some(m => m.key === key)
    if (hasAnyMatch) continue
    const desired = selected[key]
    const actual = f?.[key] ?? 'unknown'
    matchBits.push(`<strong>${escapeHtml(key)}</strong> ≠ ${escapeHtml(desired)} (is ${escapeHtml(actual)})`)
  }

  const why = [
    `<strong>Filters</strong> ${(parts.hard.score * 100).toFixed(0)}% match`,
    `<strong>Goals</strong> ${(parts.intent * 100).toFixed(0)}% (${escapeHtml(prettyPrimaryIntent(f.primaryIntent || 'unknown'))})`,
    `<strong>Keywords</strong> ${(parts.text * 100).toFixed(0)}%`
  ].join(' · ')

  const tags = pickTags(f).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')
  const previewSlug = guessSlugFromRow(row)
  const sourceBlobUrl = designMdGithubBlobUrl(path)
  const scoreTitle = buildScoreTooltip(
    score,
    parts,
    prettyPrimaryIntent(f.primaryIntent || 'unknown')
  )

  const sourceSection = path && sourceBlobUrl
    ? `<div class="cardSection">
      <div class="cardSectionTitle">Source file</div>
      <a class="previewExternalLink cardSourceLink" href="${escapeHtml(sourceBlobUrl)}" target="_blank" rel="noreferrer" aria-label="Open ${escapeHtml(path)} on GitHub">
        <span class="previewExternalText">${escapeHtml(path)}</span>${EXTERNAL_ICON_SVG}
      </a>
    </div>`
    : `<div class="cardSection">
      <div class="cardSectionTitle">Source file</div>
      <p class="cardSourceMissing">No path in data for this row.</p>
    </div>`

  return `
  <article class="card cardCalm">
    <div class="cardTop">
      <div>
        <h3 class="cardTitle">${escapeHtml(name)}</h3>
        ${tags ? `<div class="meta metaSparse">${tags}</div>` : ''}
      </div>
      <div class="tooltipHost" tabindex="0" aria-describedby="${scoreTipId}">
        <div class="scoreCompact">${(score * 100).toFixed(0)}</div>
        <div class="tooltipBubble" id="${scoreTipId}" role="tooltip">${escapeHtml(scoreTitle)}</div>
      </div>
    </div>
    <div class="cardSection">
      <div class="cardSectionTitle">Sample</div>
      <div class="previewGrid" data-preview-root="${escapeHtml(previewSlug)}" data-preview-mount="1">
        <span class="previewEmpty">Loading…</span>
      </div>
    </div>
    <div class="notes notesClamp" id="${notesId}">${escapeHtml(notes)}</div>
    <div class="notesActions">
      <button class="linkBtn" type="button" data-toggle-notes="${notesId}" aria-expanded="false">More about this system</button>
    </div>
    ${sourceSection}
    <details class="cardDisclosure">
      <summary class="cardDisclosureSummary">Why it’s near the top</summary>
      <div class="why whyFlush">${why}</div>
    </details>
  </article>
  `
}

function computeRanking ({ rows, state }) {
  const selected = buildSelectedFilters(state)
  const intentWeights = normalizeIntentWeights(state.iTrust, state.iExploration, state.iEmotional)

  const weights = normalizeWeights(
    toNumber(state.wHard, 70),
    toNumber(state.wVibe, 20),
    toNumber(state.wText, 10)
  )

  const ranked = []
  for (const row of rows) {
    const f = row?.features || {}
    const hard = computeHardMatch(f, selected)
    const intent = computeIntentMatch(f?.primaryIntent || 'unknown', intentWeights)
    const text = computeTextMatch(state.query, row)

    const score = (weights.wHard * hard.score) + (weights.wVibe * intent) + (weights.wText * text)

    ranked.push({
      row,
      score,
      parts: { hard, intent, text }
    })
  }

  ranked.sort((a, b) => b.score - a.score)
  return { ranked, selected, weights, intentWeights }
}

function bind () {
  const els = {
    query: document.getElementById('query'),
    businessModel: document.getElementById('businessModel'),
    themeMode: document.getElementById('themeMode'),
    layoutDensity: document.getElementById('layoutDensity'),
    contentFocus: document.getElementById('contentFocus'),
    resultsList: document.getElementById('resultsList'),
    matchCount: document.getElementById('matchCount'),
    dataStatus: document.getElementById('dataStatus'),
    resetBtn: document.getElementById('resetBtn'),
    updateStatus: document.getElementById('updateStatus'),
    presetChips: document.getElementById('presetChips'),
    intentPresets: document.getElementById('intentPresets')
  }

  return els
}

function readState (els, intentRaw) {
  return {
    query: els.query.value,
    businessModel: els.businessModel.value,
    themeMode: els.themeMode.value,
    layoutDensity: els.layoutDensity.value,
    contentFocus: els.contentFocus.value,
    iTrust: String(intentRaw.trust),
    iExploration: String(intentRaw.exploration),
    iEmotional: String(intentRaw.emotional),
    wHard: '70',
    wVibe: '20',
    wText: '10'
  }
}

function syncGoalChips (rootEl, activeKey) {
  if (!rootEl) return
  rootEl.querySelectorAll('[data-intent]').forEach((btn) => {
    const on = btn.getAttribute('data-intent') === activeKey
    btn.classList.toggle('goalChipActive', on)
    btn.setAttribute('aria-pressed', on ? 'true' : 'false')
  })
}

function wire (els, rows) {
  let typingTimer = null
  let lastRenderAt = 0
  const intentRaw = { trust: 34, exploration: 33, emotional: 33 }
  let activeGoal = 'balanced'

  const resetPanel = () => {
    els.query.value = ''
    els.businessModel.value = 'any'
    els.themeMode.value = 'any'
    els.layoutDensity.value = 'any'
    els.contentFocus.value = 'any'
    intentRaw.trust = 34
    intentRaw.exploration = 33
    intentRaw.emotional = 33
    activeGoal = 'balanced'
  }

  const setIntentPreset = (preset) => {
    if (preset === 'trust') {
      activeGoal = 'trust'
      intentRaw.trust = 70
      intentRaw.exploration = 20
      intentRaw.emotional = 10
      return
    }
    if (preset === 'exploration') {
      activeGoal = 'exploration'
      intentRaw.trust = 20
      intentRaw.exploration = 70
      intentRaw.emotional = 10
      return
    }
    if (preset === 'emotional') {
      activeGoal = 'emotional'
      intentRaw.trust = 15
      intentRaw.exploration = 20
      intentRaw.emotional = 65
      return
    }
    activeGoal = 'balanced'
    intentRaw.trust = 34
    intentRaw.exploration = 33
    intentRaw.emotional = 33
  }

  const applyPreset = (preset) => {
    if (preset === 'devtools-docs') {
      els.businessModel.value = 'devtools'
      els.contentFocus.value = 'codeFirst'
      els.layoutDensity.value = 'dense'
      els.themeMode.value = 'dual'
      setIntentPreset('trust')
      els.query.value = 'docs code api developer'
      return
    }
    if (preset === 'saas-dashboard') {
      els.businessModel.value = 'saas'
      els.layoutDensity.value = 'dense'
      els.contentFocus.value = 'productScreenshots'
      els.themeMode.value = 'dual'
      setIntentPreset('trust')
      els.query.value = 'dashboard settings tables'
      return
    }
    if (preset === 'marketplace-browse') {
      els.businessModel.value = 'marketplace'
      els.layoutDensity.value = 'balanced'
      els.contentFocus.value = 'photography'
      els.themeMode.value = 'lightFirst'
      setIntentPreset('exploration')
      els.query.value = 'browse grid search'
      return
    }
    if (preset === 'brand-emotional') {
      els.businessModel.value = 'other'
      els.layoutDensity.value = 'sparse'
      els.contentFocus.value = 'mixed'
      els.themeMode.value = 'lightFirst'
      setIntentPreset('emotional')
      els.query.value = 'marketing story brand'
    }
  }

  const setUpdated = () => {
    lastRenderAt = Date.now()
    els.updateStatus.innerHTML = `<span class="pulse isActive"><span class="pulseDot"></span><span>Refreshed</span></span>`
    window.setTimeout(() => {
      const ms = Date.now() - lastRenderAt
      if (ms < 900) return
      els.updateStatus.textContent = ''
    }, 950)
  }

  const mountPreviewsForTop = async () => {
    try {
      const mounts = Array.from(els.resultsList.querySelectorAll('[data-preview-mount="1"]')).slice(0, 24)
      const slugs = mounts.map(m => m.getAttribute('data-preview-root')).filter(Boolean)
      const unique = Array.from(new Set(slugs)).slice(0, 24)

      await Promise.all(unique.map(async (slug) => {
        const previews = await discoverPreviews(slug)
        const nodes = mounts.filter(n => n.getAttribute('data-preview-root') === slug)
        for (const node of nodes) {
          if (!previews || previews.length === 0) {
            node.innerHTML = '<span class="previewEmpty">No sample HTML in this folder yet.</span>'
            continue
          }
          const { light, dark, hasBoth } = pickLightDarkPreviews(previews)
          const lightHref = buildPreviewLink(slug, light)
          const darkHref = buildPreviewLink(slug, dark)
          const initialSrc = lightHref
          const toolbar = hasBoth
            ? `
            <div class="previewToolbar">
              <span class="previewToolbarLabel">Sample look</span>
              <div class="previewThemeSeg" role="group" aria-label="Light or dark sample">
                <button type="button" class="previewThemeBtn isActive" data-preview-theme="light" aria-pressed="true">Light</button>
                <button type="button" class="previewThemeBtn" data-preview-theme="dark" aria-pressed="false">Dark</button>
              </div>
            </div>`
            : `
            <div class="previewToolbar previewToolbar--solo">
              <span class="previewToolbarLabel">Embedded sample</span>
            </div>`

          const links = previews.slice(0, 6).map((file) => {
            const href = buildPreviewLink(slug, file)
            return `<a class="previewExternalLink" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"><span class="previewExternalText">${escapeHtml(file)}</span>${EXTERNAL_ICON_SVG}</a>`
          }).join('')

          node.innerHTML = `
            <div class="previewShell" data-preview-shell="1" data-src-light="${escapeHtml(lightHref)}" data-src-dark="${escapeHtml(darkHref)}">
              ${toolbar}
              <div class="previewFrame">
                <iframe class="previewIframe" aria-label="Embedded sample for ${escapeHtml(slug)}" src="${escapeHtml(initialSrc)}" loading="lazy"></iframe>
              </div>
            </div>
            <div class="previewExternalRow">
              <span class="previewExternalLabel">Open full page</span>
              <div class="previewExternalList">${links}</div>
            </div>
          `
        }
      }))
    } catch {}
  }

  const render = () => {
    syncAllFilterSelectDisplays()
    const state = readState(els, intentRaw)
    const { ranked, selected } = computeRanking({ rows, state })
    els.matchCount.textContent = String(ranked.length)

    els.resultsList.innerHTML = ranked.slice(0, 24).map(item => {
      return renderCard({
        row: item.row,
        score: item.score,
        parts: item.parts,
        selected
      })
    }).join('')

    const toggleBtns = Array.from(els.resultsList.querySelectorAll('[data-toggle-notes]'))
    for (const btn of toggleBtns) {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-toggle-notes')
        const target = document.getElementById(id)
        if (!target) return
        const isExpanded = e.currentTarget.getAttribute('aria-expanded') === 'true'
        if (isExpanded) {
          target.classList.add('notesClamp')
          e.currentTarget.setAttribute('aria-expanded', 'false')
          e.currentTarget.textContent = 'More about this system'
          return
        }
        target.classList.remove('notesClamp')
        e.currentTarget.setAttribute('aria-expanded', 'true')
        e.currentTarget.textContent = 'Show less'
      })
    }

    syncGoalChips(els.intentPresets, activeGoal)

    setUpdated()
    mountPreviewsForTop()
  }

  const onInputDebounced = () => {
    if (typingTimer) window.clearTimeout(typingTimer)
    typingTimer = window.setTimeout(render, 120)
  }

  els.query.addEventListener('input', onInputDebounced)

  const filterPanel = document.querySelector('.panel.rail')
  attachCustomFilterHandlers(filterPanel, render)
  els.presetChips.addEventListener('click', (e) => {
    const btn = e.target?.closest?.('[data-preset]')
    if (!btn) return
    applyPreset(btn.getAttribute('data-preset'))
    render()
  })

  els.intentPresets.addEventListener('click', (e) => {
    const btn = e.target?.closest?.('[data-intent]')
    if (!btn) return
    setIntentPreset(btn.getAttribute('data-intent'))
    render()
  })

  els.resetBtn.addEventListener('click', () => {
    resetPanel()
    render()
  })

  els.resultsList.addEventListener('click', (e) => {
    const btn = e.target.closest?.('[data-preview-theme]')
    if (!btn || !els.resultsList.contains(btn)) return
    const shell = btn.closest('[data-preview-shell]')
    if (!shell) return
    const mode = btn.getAttribute('data-preview-theme')
    const light = shell.getAttribute('data-src-light')
    const dark = shell.getAttribute('data-src-dark')
    const iframe = shell.querySelector('.previewIframe')
    const frame = shell.querySelector('.previewFrame')
    if (!iframe || !light || !dark) return
    const next = mode === 'dark' ? dark : light
    iframe.src = next
    shell.querySelectorAll('[data-preview-theme]').forEach(b => {
      const active = b === btn
      b.classList.toggle('isActive', active)
      b.setAttribute('aria-pressed', active ? 'true' : 'false')
    })
    if (frame) frame.classList.toggle('previewFrame--dark', mode === 'dark')
  })

  resetPanel()
  render()
}

function installLayoutMetrics () {
  const header = document.getElementById('refAppHeader') || document.querySelector('.header')
  if (!header) return
  const sync = () => {
    const h = Math.ceil(header.getBoundingClientRect().height)
    document.documentElement.style.setProperty('--ref-header-h', `${h}px`)
  }
  sync()
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => sync())
    ro.observe(header)
  }
  window.addEventListener('resize', sync)
  if (document.fonts?.ready) {
    document.fonts.ready.then(sync).catch(() => {})
  }
}

async function main () {
  installLayoutMetrics()
  const els = bind()

  try {
    els.dataStatus.textContent = 'Loading companies…'
    const res = await fetch(FEATURES_URL, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Failed to load features.json (${res.status})`)
    const data = await res.json()

    const rows = Array.isArray(data?.rows) ? data.rows : []
    if (rows.length === 0) throw new Error('features.json has no rows')

    const models = uniqSorted(rows.map(r => r?.features?.businessModel))
    const themeModes = uniqSorted(rows.map(r => r?.features?.themeMode))
    const densities = uniqSorted(rows.map(r => r?.features?.layoutDensity))
    const contentFocuses = uniqSorted(rows.map(r => r?.features?.contentFocus))

    populateCustomFilter({
      inputEl: els.businessModel,
      options: models,
      preferredOrder: ['devtools', 'saas', 'ai', 'fintech', 'marketplace', 'ecommerce', 'media', 'social', 'other', 'unknown']
    })
    populateCustomFilter({
      inputEl: els.themeMode,
      options: themeModes,
      preferredOrder: ['darkFirst', 'dual', 'lightFirst', 'unknown']
    })
    populateCustomFilter({
      inputEl: els.layoutDensity,
      options: densities,
      preferredOrder: ['dense', 'balanced', 'sparse', 'unknown']
    })
    populateCustomFilter({
      inputEl: els.contentFocus,
      options: contentFocuses,
      preferredOrder: ['codeFirst', 'productScreenshots', 'photography', 'illustration', 'mixed', 'unknown']
    })

    els.dataStatus.textContent = `${rows.length} companies`
    wire(els, rows)
  } catch (err) {
    els.dataStatus.textContent = 'Something went wrong'
    els.resultsList.innerHTML = `
      <div class="card">
        <div class="cardTitle">We couldn’t load the company list</div>
        <div class="notes">Run a simple local server from the project folder (see the note at the bottom of the page). The app needs to read <span class="mono">${escapeHtml(FEATURES_URL)}</span>.</div>
        <div class="why"><strong>Details</strong> ${escapeHtml(err?.message || String(err))}</div>
      </div>
    `
  }
}

main()

