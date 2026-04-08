import {
  COLLECTION_BUCKET_LABEL,
  ENUM_FIX,
  FEATURE_SHORT_LABEL,
  INTENT_READABLE
} from './config.js'

export function prettyEnumValue (v) {
  if (!v) return ''
  if (COLLECTION_BUCKET_LABEL[v]) return COLLECTION_BUCKET_LABEL[v]
  if (ENUM_FIX[v]) return ENUM_FIX[v]
  return v
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[\s_]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export function prettyPrimaryIntent (v) {
  return INTENT_READABLE[v] || prettyEnumValue(v)
}

export function filterFieldLabel (key) {
  return FEATURE_SHORT_LABEL[key] || key
}

/** Human-readable value for filter keys. */
export function formatFilterDisplayValue (key, v) {
  if (!v || v === 'unknown') return 'Not specified'
  if (key === 'collectionBucket') return COLLECTION_BUCKET_LABEL[v] || prettyEnumValue(v)
  if (key === 'primaryIntent') return prettyPrimaryIntent(v)
  return prettyEnumValue(v)
}
