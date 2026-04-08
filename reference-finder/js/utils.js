export function escapeHtml (s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function clamp (n, min, max) {
  return Math.max(min, Math.min(max, n))
}

export function toNumber (v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function uniqSorted (values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)))
}

export function sortFilterOptions (options, preferredOrder) {
  const orderMap = new Map((preferredOrder || []).map((v, i) => [v, i]))
  return options.slice().sort((a, b) => {
    const ai = orderMap.has(a) ? orderMap.get(a) : 10_000
    const bi = orderMap.has(b) ? orderMap.get(b) : 10_000
    if (ai !== bi) return ai - bi
    return String(a).localeCompare(String(b))
  })
}
