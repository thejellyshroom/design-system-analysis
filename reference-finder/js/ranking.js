import { INTENT_BUCKET, SELECT_KEYS } from './config.js'
import { computeTextMatch } from './text-match.js'
import { clamp, toNumber } from './utils.js'

export function normalizeIntentWeights (trust, exploration, emotional) {
  const t = clamp(toNumber(trust, 0), 0, 100)
  const e = clamp(toNumber(exploration, 0), 0, 100)
  const m = clamp(toNumber(emotional, 0), 0, 100)
  const sum = t + e + m
  if (sum <= 0) return { trust: 1 / 3, exploration: 1 / 3, emotional: 1 / 3 }
  return { trust: t / sum, exploration: e / sum, emotional: m / sum }
}

export function computeHardMatch (rowFeatures, selected) {
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

/** How strongly row features read as “trust / clarity” (0–1). */
function dimTrustSignals (f) {
  let s = 0
  if (f.primaryIntent === 'trust') s += 0.38
  else if (f.primaryIntent === 'unknown') s += 0.1
  if (f.contentFocus === 'productScreenshots') s += 0.14
  if (f.contentFocus === 'mixed') s += 0.07
  if (f.themeMode === 'lightFirst') s += 0.1
  if (f.themeMode === 'dual') s += 0.05
  if (f.layoutDensity === 'balanced') s += 0.08
  if (f.layoutDensity === 'dense') s += 0.04
  if (f.surfaceDepth === 'flat') s += 0.08
  if (f.surfaceDepth === 'subtle') s += 0.05
  if (f.typographyTone === 'neutral') s += 0.06
  return Math.min(1, s / 0.82)
}

/** How strongly row features read as “browse / discover” (0–1). */
function dimExplorationSignals (f) {
  let s = 0
  if (f.primaryIntent === 'exploration') s += 0.4
  if (f.uxMode === 'browsingHeavy') s += 0.22
  if (f.contentFocus === 'photography') s += 0.18
  if (f.contentFocus === 'illustration') s += 0.1
  if (f.themeMode === 'lightFirst') s += 0.08
  if (f.imageryUsage === 'imageFirst') s += 0.1
  return Math.min(1, s / 0.75)
}

/** How strongly row features read as “brand / emotion” (0–1). */
function dimEmotionalSignals (f) {
  let s = 0
  if (f.primaryIntent === 'emotionalBranding') s += 0.42
  if (f.contentFocus === 'illustration') s += 0.18
  if (f.colorStrategy === 'gradientLed') s += 0.14
  if (f.colorStrategy === 'multiAccent') s += 0.1
  if (f.typographyTone === 'expressive') s += 0.14
  if (f.typographyTone === 'premium') s += 0.1
  return Math.min(1, s / 0.78)
}

function computeIntentFeatureAlignment (f, intentWeights) {
  const t = dimTrustSignals(f)
  const e = dimExplorationSignals(f)
  const m = dimEmotionalSignals(f)
  return clamp(
    intentWeights.trust * t + intentWeights.exploration * e + intentWeights.emotional * m,
    0,
    1
  )
}

function computeIntentBlend (f, intentWeights) {
  const align = computeIntentFeatureAlignment(f, intentWeights)
  const legacy = computeIntentMatch(f?.primaryIntent || 'unknown', intentWeights)
  return 0.62 * align + 0.38 * legacy
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

export function computeRanking ({ rows, state }) {
  const selected = buildSelectedFilters(state)
  const intentWeights = normalizeIntentWeights(state.iTrust, state.iExploration, state.iEmotional)
  const strictFilters = Object.keys(selected).length > 0
  const queryHasText = String(state.query || '').trim().length > 0

  const ranked = []
  for (const row of rows) {
    const f = row?.features || {}
    const hard = computeHardMatch(f, selected)
    if (strictFilters && hard.misses.length > 0) continue

    const intent = computeIntentBlend(f, intentWeights)
    const text = computeTextMatch(state.query, row)

    let score
    if (strictFilters) {
      const tw = queryHasText ? 0.38 : 0.52
      const iw = 1 - tw
      score = iw * intent + tw * text
    } else {
      const tw = queryHasText ? 0.32 : 0.08
      const iw = 1 - tw
      score = iw * intent + tw * text
    }

    ranked.push({
      row,
      score,
      parts: {
        hard,
        intent,
        text,
        strictFilters
      }
    })
  }

  ranked.sort((a, b) => {
    const d = b.score - a.score
    if (Math.abs(d) > 1e-9) return d > 0 ? 1 : -1
    const na = (a.row?.company?.name || a.row?.company?.slug || '').localeCompare(
      b.row?.company?.name || b.row?.company?.slug || '',
      undefined,
      { sensitivity: 'base' }
    )
    return na
  })
  return { ranked, selected, intentWeights }
}
