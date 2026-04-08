import { EXTERNAL_ICON_SVG } from './config.js'
import { escapeHtml } from './utils.js'

const previewCache = new Map()
const previewInFlight = new Map()

export function guessSlugFromRow (row) {
  const slug = row?.company?.slug
  if (slug) return slug
  const p = row?.source?.designMdPath || ''
  const m = p.match(/^design-md\/([^/]+)\//)
  return m?.[1] || ''
}

/** Folder name under design-md/ (may differ from marketing slug, e.g. linear.app). */
export function previewFolderFromRow (row) {
  const p = String(row?.source?.designMdPath || '')
  const m = p.match(/^design-md\/([^/]+)\//)
  if (m) return m[1]
  return row?.company?.slug || ''
}

export function buildPreviewLink (slug, file) {
  const safeSlug = encodeURIComponent(slug)
  const safeFile = encodeURIComponent(file)
  return `../design-md/${safeSlug}/${safeFile}`
}

export function pickLightDarkPreviews (files) {
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

/** Also match Apache/nginx-style listings (href='file'). */
function parseDirectoryListingForPreviewsLoose (html) {
  const matches = []
  const re = /href=(["'])([^"']+\.html)\1/gi
  let m
  while ((m = re.exec(html))) {
    let name = m[2] || ''
    if (!name || name.includes('/')) continue
    try {
      name = decodeURIComponent(name)
    } catch {}
    name = name.replaceAll('%20', ' ')
    if (!/^preview.*\.html$/i.test(name)) continue
    matches.push(name)
  }
  return Array.from(new Set(matches)).sort((a, b) => a.localeCompare(b))
}

async function probePreviewFile (folder, filename) {
  const url = `../design-md/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}`
  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store' })
    return res.ok
  } catch {
    return false
  }
}

export async function discoverPreviews (folder) {
  if (!folder) return []
  if (previewCache.has(folder)) return previewCache.get(folder)
  if (previewInFlight.has(folder)) return previewInFlight.get(folder)

  const p = (async () => {
    try {
      const res = await fetch(`../design-md/${encodeURIComponent(folder)}/`, { cache: 'no-store' })
      let previews = []
      if (res.ok) {
        const html = await res.text()
        previews = parseDirectoryListingForPreviews(html)
        if (previews.length === 0) {
          previews = parseDirectoryListingForPreviewsLoose(html)
        }
      }
      if (previews.length === 0) {
        const candidates = ['preview.html', 'preview-dark.html']
        const found = []
        for (const f of candidates) {
          if (await probePreviewFile(folder, f)) found.push(f)
        }
        previews = found.sort((a, b) => a.localeCompare(b))
      }
      previewCache.set(folder, previews)
      return previews
    } catch {
      previewCache.set(folder, [])
      return []
    } finally {
      previewInFlight.delete(folder)
    }
  })()

  previewInFlight.set(folder, p)
  return p
}

/** Fills iframe preview shells in the first 24 result cards. */
export async function mountPreviewsForTop (resultsListEl) {
  if (!resultsListEl) return
  try {
    const mounts = Array.from(resultsListEl.querySelectorAll('[data-preview-mount="1"]')).slice(0, 24)
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
