import type { Directive } from 'vue'

let tooltipEl: HTMLDivElement | null = null
let showTimer: ReturnType<typeof setTimeout> | null = null
let activeTarget: HTMLElement | null = null
let listenersAttached = false

function hideTooltip(): void {
  if (showTimer) {
    clearTimeout(showTimer)
    showTimer = null
  }
  activeTarget = null
  if (tooltipEl) {
    tooltipEl.style.opacity = '0'
  }
}

function showTooltip(el: HTMLElement, text: string): void {
  if (!text) return
  if (!tooltipEl) {
    tooltipEl = document.createElement('div')
    tooltipEl.setAttribute('role', 'tooltip')
    tooltipEl.className =
      'fixed z-[9999] pointer-events-none px-2 py-1 text-[11px] font-medium rounded shadow-lg bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 whitespace-nowrap transition-opacity duration-100 opacity-0'
    document.body.appendChild(tooltipEl)
  }
  if (!listenersAttached) {
    listenersAttached = true
    window.addEventListener('pointerdown', hideTooltip, true)
    window.addEventListener('blur', hideTooltip)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideTooltip()
    })
  }

  tooltipEl.textContent = text
  tooltipEl.style.opacity = '0'
  const rect = el.getBoundingClientRect()
  const tipRect = tooltipEl.getBoundingClientRect()
  const margin = 6
  const left = Math.max(4, Math.min(window.innerWidth - tipRect.width - 4, rect.left + rect.width / 2 - tipRect.width / 2))
  const top =
    rect.bottom + margin + tipRect.height <= window.innerHeight
      ? rect.bottom + margin
      : Math.max(4, rect.top - tipRect.height - margin)

  tooltipEl.style.left = `${Math.round(left)}px`
  tooltipEl.style.top = `${Math.round(top)}px`
  tooltipEl.style.opacity = '1'
}

type TooltipEl = HTMLElement & {
  __tooltipText?: string
  __tooltipCleanup?: () => void
}

export const vTooltip: Directive<TooltipEl, string | undefined> = {
  mounted(el, binding) {
    el.__tooltipText = binding.value || ''
    const onEnter = () => {
      if (showTimer) clearTimeout(showTimer)
      const text = el.__tooltipText
      if (!text) return
      activeTarget = el
      showTimer = setTimeout(() => {
        if (activeTarget === el && document.body.contains(el)) {
          showTooltip(el, el.__tooltipText || '')
        }
      }, 120)
    }
    const onLeave = () => {
      if (activeTarget === el) hideTooltip()
    }
    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)
    el.__tooltipCleanup = () => {
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onLeave)
    }
  },
  updated(el, binding) {
    el.__tooltipText = binding.value || ''
    if (activeTarget === el && tooltipEl && tooltipEl.style.opacity === '1') {
      tooltipEl.textContent = el.__tooltipText
    }
  },
  beforeUnmount(el) {
    if (activeTarget === el) hideTooltip()
    el.__tooltipCleanup?.()
  }
}
