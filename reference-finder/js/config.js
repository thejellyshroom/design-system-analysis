export const FEATURES_URL = '../analysis/features.json'

/** Raw DESIGN.md on GitHub (awesome-design-md) */
export const DESIGN_MD_GITHUB_BLOB_BASE =
  'https://github.com/VoltAgent/awesome-design-md/blob/main/'

export function designMdGithubBlobUrl (designMdPath) {
  const p = String(designMdPath || '').trim().replace(/^\/+/, '')
  if (!p) return ''
  return DESIGN_MD_GITHUB_BLOB_BASE + encodeURI(p)
}

export const INTENT_BUCKET = {
  trust: 'trust',
  exploration: 'exploration',
  emotionalBranding: 'emotional',
  speed: 'exploration',
  conversion: 'emotional',
  unknown: 'unknown'
}

/** Display titles for `features.collectionBucket` */
export const COLLECTION_BUCKET_LABEL = {
  aiAndMachineLearning: 'AI & Machine Learning',
  automotiveAndMobility: 'Automotive & Mobility',
  developerToolsAndPlatforms: 'Developer Tools & Platforms',
  infrastructureAndCloud: 'Infrastructure & Cloud',
  designAndProductivity: 'Design & Productivity',
  fintechAndCrypto: 'Fintech & Crypto',
  enterpriseAndConsumer: 'Enterprise & Consumer'
}

export const SELECT_KEYS = [
  'collectionBucket',
  'themeMode',
  'layoutDensity',
  'contentFocus'
]

export const ENUM_FIX = {
  api: 'API',
  unknown: 'Not specified'
}

export const FEATURE_SHORT_LABEL = {
  collectionBucket: 'Category',
  uxMode: 'UX style',
  themeMode: 'Theme',
  layoutDensity: 'Density',
  shadowStyle: 'Depth',
  contentFocus: 'On-screen',
  primaryIntent: 'Focus'
}

export const INTENT_READABLE = {
  trust: 'trust & clarity',
  exploration: 'browsing & discovery',
  speed: 'speed & efficiency',
  conversion: 'conversion',
  emotionalBranding: 'brand & emotion',
  unknown: 'mixed'
}

export const EXTERNAL_ICON_SVG =
  '<svg class="externalIcon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5M16.5 3h6m0 0v6m0-6L10.5 17.25" /></svg>'
