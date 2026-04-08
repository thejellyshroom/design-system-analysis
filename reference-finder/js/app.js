import { FEATURES_URL } from './config.js'
import {
  attachCustomFilterHandlers,
  populateCustomFilter,
  syncAllFilterSelectDisplays
} from './custom-select.js'
import { renderCard } from './cards.js'
import { computeRanking } from './ranking.js'
import { mountPreviewsForTop } from './previews.js'
import { escapeHtml, uniqSorted } from './utils.js'

function bind () {
  const els = {
    query: document.getElementById('query'),
    collectionBucket: document.getElementById('collectionBucket'),
    themeMode: document.getElementById('themeMode'),
    layoutDensity: document.getElementById('layoutDensity'),
    contentFocus: document.getElementById('contentFocus'),
    resultsList: document.getElementById('resultsList'),
    matchCount: document.getElementById('matchCount'),
    dataStatus: document.getElementById('dataStatus'),
    resetBtn: document.getElementById('resetBtn'),
    updateStatus: document.getElementById('updateStatus'),
    intentPresets: document.getElementById('intentPresets')
  }

  return els
}

function readState (els, intentRaw) {
  return {
    query: els.query.value,
    collectionBucket: els.collectionBucket.value,
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
    els.collectionBucket.value = 'any'
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

  const setUpdated = () => {
    lastRenderAt = Date.now()
    els.updateStatus.innerHTML = '<span class="pulse isActive"><span class="pulseDot"></span><span>Refreshed</span></span>'
    window.setTimeout(() => {
      const ms = Date.now() - lastRenderAt
      if (ms < 900) return
      els.updateStatus.textContent = ''
    }, 950)
  }

  const render = () => {
    syncAllFilterSelectDisplays()
    const state = readState(els, intentRaw)
    const { ranked, selected } = computeRanking({ rows, state })
    els.matchCount.textContent = String(ranked.length)

    if (ranked.length === 0) {
      els.resultsList.innerHTML = `
      <div class="card cardCalm">
        <div class="cardTop">
          <h3 class="cardTitle">No matches</h3>
        </div>
        <div class="notes whyFlush">
          Every selected filter must match a system. Loosen one or more filters (choose “Any”) or clear the search box, then try again.
        </div>
      </div>`
      syncGoalChips(els.intentPresets, activeGoal)
      setUpdated()
      return
    }

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
    mountPreviewsForTop(els.resultsList)
  }

  const onInputDebounced = () => {
    if (typingTimer) window.clearTimeout(typingTimer)
    typingTimer = window.setTimeout(render, 120)
  }

  els.query.addEventListener('input', onInputDebounced)

  const filterPanel = document.querySelector('.panel.rail')
  attachCustomFilterHandlers(filterPanel, render)
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

    const buckets = uniqSorted(rows.map(r => r?.features?.collectionBucket))
    const themeModes = uniqSorted(rows.map(r => r?.features?.themeMode))
    const densities = uniqSorted(rows.map(r => r?.features?.layoutDensity))
    const contentFocuses = uniqSorted(rows.map(r => r?.features?.contentFocus))

    populateCustomFilter({
      inputEl: els.collectionBucket,
      options: buckets,
      preferredOrder: [
        'aiAndMachineLearning',
        'automotiveAndMobility',
        'developerToolsAndPlatforms',
        'infrastructureAndCloud',
        'designAndProductivity',
        'fintechAndCrypto',
        'enterpriseAndConsumer'
      ]
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
