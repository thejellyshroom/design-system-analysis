import {
  EXTERNAL_ICON_SVG,
  FEATURE_SHORT_LABEL,
  designMdGithubBlobUrl
} from './config.js'
import {
  filterFieldLabel,
  formatFilterDisplayValue,
  prettyEnumValue,
  prettyPrimaryIntent
} from './format.js'
import { guessSlugFromRow, previewFolderFromRow } from './previews.js'
import { escapeHtml } from './utils.js'

function pickTags (rowFeatures) {
  const keys = ['collectionBucket', 'uxMode', 'themeMode', 'layoutDensity', 'shadowStyle', 'contentFocus', 'primaryIntent']
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

export function buildScoreTooltip (score) {
  const total = (score * 100).toFixed(0)
  return `Closeness score: ${total} (0–100). For ordering only—not a quality judgment.`
}

export function renderCard ({ row, score, parts, selected }) {
  const name = row?.company?.name || row?.company?.slug || 'Unknown'
  const path = row?.source?.designMdPath || ''
  const f = row?.features || {}
  const notes = row?.notes || ''
  const notesId = `notes-${escapeHtml(guessSlugFromRow(row) || String(Math.random()).slice(2))}`
  const scoreTipId = `stip-${String(Math.random()).toString(36).slice(2, 11)}`

  const matchBits = []
  for (const m of parts.hard.matches) {
    const label = filterFieldLabel(m.key)
    const shown = formatFilterDisplayValue(m.key, m.actual)
    matchBits.push(`<strong>${escapeHtml(label)}</strong> = ${escapeHtml(shown)}`)
  }
  for (const key of Object.keys(selected)) {
    const hasAnyMatch = parts.hard.matches.some(m => m.key === key)
    if (hasAnyMatch) continue
    const desired = selected[key]
    const actual = f?.[key] ?? 'unknown'
    const label = filterFieldLabel(key)
    matchBits.push(
      `<strong>${escapeHtml(label)}</strong> wanted ${escapeHtml(formatFilterDisplayValue(key, desired))} · this row is ${escapeHtml(formatFilterDisplayValue(key, actual))}`
    )
  }

  const filterWhy = Object.keys(selected).length > 0
    ? `<strong>Filters</strong> all selected match`
    : `<strong>Filters</strong> not restricting (any)`
  const why = [
    filterWhy,
    `<strong>Goals</strong> ${(parts.intent * 100).toFixed(0)}% vs your sliders (${escapeHtml(prettyPrimaryIntent(f.primaryIntent || 'unknown'))})`,
    `<strong>Keywords</strong> ${(parts.text * 100).toFixed(0)}%`
  ].join(' · ')

  const tags = pickTags(f).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')
  const previewFolder = previewFolderFromRow(row)
  const readmePath = path
    ? String(path).replace(/DESIGN\.md$/i, 'README.md')
    : (previewFolder ? `design-md/${previewFolder}/README.md` : '')
  const sourceBlobUrl = designMdGithubBlobUrl(readmePath)
  const scoreTitle = buildScoreTooltip(score)

  const sourceSection = readmePath && sourceBlobUrl
    ? `<div class="cardSection">
      <div class="cardSectionTitle">Source file (README)</div>
      <a class="previewExternalLink cardSourceLink" href="${escapeHtml(sourceBlobUrl)}" target="_blank" rel="noreferrer" aria-label="Open ${escapeHtml(readmePath)} on GitHub">
        <span class="previewExternalText">${escapeHtml(readmePath)}</span>${EXTERNAL_ICON_SVG}
      </a>
    </div>`
    : `<div class="cardSection">
      <div class="cardSectionTitle">Source file (README)</div>
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
      <div class="previewGrid" data-preview-root="${escapeHtml(previewFolder)}" data-preview-mount="1">
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
      ${matchBits.length
    ? `<ul class="whyMatchList">${matchBits.map((b) => `<li>${b}</li>`).join('')}</ul>`
    : ''}
    </details>
  </article>
  `
}
