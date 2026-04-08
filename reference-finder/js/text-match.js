import { COLLECTION_BUCKET_LABEL } from './config.js'
import { prettyEnumValue, prettyPrimaryIntent } from './format.js'

function escapeRegex (s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Quoted segments = phrases; otherwise whitespace-separated tokens (max 16). */
function parseSearchQuery (raw) {
  const q = String(raw || '').trim()
  if (!q) return []
  const units = []
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g
  let m
  while ((m = re.exec(q)) !== null) {
    if (m[1] !== undefined) {
      const t = m[1].trim().toLowerCase().replace(/\s+/g, ' ')
      if (t) units.push({ text: t, isPhrase: true })
    } else if (m[2] !== undefined) {
      const t = m[2].trim().toLowerCase().replace(/\s+/g, ' ')
      if (t) units.push({ text: t, isPhrase: true })
    } else if (m[3]) {
      const t = m[3].trim().toLowerCase()
      if (t) units.push({ text: t, isPhrase: false })
    }
  }
  return units.slice(0, 16)
}

function stemVariants (word) {
  const w = String(word || '').toLowerCase()
  const out = new Set([w])
  if (w.length < 3) return out
  if (w.length > 4 && w.endsWith('ing')) out.add(w.slice(0, -3))
  if (w.length > 3 && w.endsWith('ed') && !w.endsWith('eed')) out.add(w.slice(0, -2))
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) out.add(w.slice(0, -1))
  if (w.length > 5 && w.endsWith('ies')) out.add(w.slice(0, -3) + 'y')
  return out
}

function boundaryMatch (hay, variant) {
  if (!hay || !variant) return false
  const r = new RegExp(`(^|[^a-z0-9])${escapeRegex(variant)}([^a-z0-9]|$)`, 'i')
  return r.test(hay)
}

function buildWordSet (text) {
  const set = new Set()
  const tokens = String(text).toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1)
  for (const t of tokens) {
    set.add(t)
    for (const v of stemVariants(t)) set.add(v)
  }
  return set
}

function buildTextMatchContext (row) {
  const nameLower = (row?.company?.name || '').toLowerCase()
  const slugLower = (row?.company?.slug || '').toLowerCase()
  const pathLower = (row?.source?.designMdPath || '').toLowerCase()
  const hayIdentity = `${nameLower} ${slugLower} ${pathLower}`.trim()

  const bucket = row?.features?.collectionBucket
  const bucketBits = bucket
    ? [bucket, COLLECTION_BUCKET_LABEL[bucket] || '', prettyEnumValue(bucket)].filter(Boolean)
    : []

  const feats = row?.features || {}
  const enumBits = []
  for (const [k, v] of Object.entries(feats)) {
    if (typeof v !== 'string') continue
    enumBits.push(v, prettyEnumValue(v))
    if (k === 'primaryIntent') enumBits.push(prettyPrimaryIntent(v))
  }

  const hayMeta = [...bucketBits, ...enumBits].join(' ').toLowerCase()
  const hayNotes = (row?.notes || '').toLowerCase()
  const hayFull = `${hayIdentity}\n${hayMeta}\n${hayNotes}`
  const wordSet = buildWordSet(hayFull)

  return {
    nameLower,
    slugLower,
    hayIdentity,
    hayMeta,
    hayNotes,
    hayFull,
    wordSet
  }
}

function scoreWord (word, ctx) {
  const { nameLower, slugLower, hayIdentity, hayMeta, hayNotes, hayFull, wordSet } = ctx
  if (!word || word.length < 2) return 0

  if (word.length <= 2) {
    let b = 0
    for (const v of stemVariants(word)) {
      if (v.length < 2) continue
      if (slugLower === v || nameLower === v) b = Math.max(b, 1)
      if (wordSet.has(v)) b = Math.max(b, 0.82)
      if (boundaryMatch(hayIdentity, v)) b = Math.max(b, 0.88)
    }
    return b
  }

  let best = 0
  for (const v of stemVariants(word)) {
    if (v.length < 2) continue
    if (slugLower === v || nameLower === v) {
      best = Math.max(best, 1)
      continue
    }
    if (boundaryMatch(nameLower, v)) best = Math.max(best, 0.98)
    if (boundaryMatch(hayIdentity, v)) best = Math.max(best, 0.94)
    if (boundaryMatch(hayMeta, v)) best = Math.max(best, 0.88)
    if (wordSet.has(v)) best = Math.max(best, 0.82)
    if (v.length >= 5 && hayIdentity.includes(v)) best = Math.max(best, 0.58)
    else if (v.length >= 4 && hayIdentity.includes(v)) best = Math.max(best, 0.46)
    if (v.length >= 5 && hayMeta.includes(v)) best = Math.max(best, 0.52)
    if (v.length >= 4 && hayNotes.includes(v)) best = Math.max(best, 0.42)
    else if (v.length >= 5 && hayNotes.includes(v)) best = Math.max(best, 0.34)
    if (v.length >= 6 && hayFull.includes(v) && best < 0.3) best = Math.max(best, 0.28)
  }
  return best
}

function scorePhrase (phrase, ctx) {
  const { hayIdentity, hayMeta, hayNotes, hayFull } = ctx
  if (!phrase) return 0
  if (hayFull.includes(phrase)) {
    if (hayIdentity.includes(phrase)) return 1
    if (hayMeta.includes(phrase)) return 0.94
    if (hayNotes.includes(phrase)) return 0.89
    return 0.87
  }
  const words = phrase.split(/\s+/).filter((w) => w.length > 0)
  const meaningful = words.filter((w) => w.length >= 2)
  if (meaningful.length === 0) return 0
  if (meaningful.length === 1) return scoreWord(meaningful[0], ctx)
  let idx = -1
  let ok = true
  for (const w of meaningful) {
    const found = hayFull.indexOf(w, idx + 1)
    if (found < 0) {
      ok = false
      break
    }
    idx = found
  }
  if (ok) return 0.81
  const avg = meaningful.reduce((sum, w) => sum + scoreWord(w, ctx), 0) / meaningful.length
  return avg * 0.74
}

export function computeTextMatch (query, row) {
  const units = parseSearchQuery(query)
  if (units.length === 0) return 0

  const ctx = buildTextMatchContext(row)
  let weightedSum = 0
  let weightTotal = 0
  for (const u of units) {
    const w = u.isPhrase ? 1.18 : 1
    weightTotal += w
    const s = u.isPhrase ? scorePhrase(u.text, ctx) : scoreWord(u.text, ctx)
    weightedSum += w * s
  }
  return weightTotal > 0 ? weightedSum / weightTotal : 0
}
