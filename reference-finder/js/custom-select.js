import { SELECT_KEYS } from './config.js'
import { prettyEnumValue } from './format.js'
import { sortFilterOptions } from './utils.js'

export function syncCustomSelectDisplay (root) {
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

export function syncAllFilterSelectDisplays () {
  for (const key of SELECT_KEYS) {
    const root = document.querySelector(`[data-custom-select="${key}"]`)
    syncCustomSelectDisplay(root)
  }
}

export function populateCustomFilter ({ inputEl, options, preferredOrder }) {
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

export function attachCustomFilterHandlers (panelEl, onChange) {
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
