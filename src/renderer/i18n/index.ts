import { createI18n } from 'vue-i18n'
import en from '../locales/en.json'
import nb from '../locales/nb.json'
import type { LanguageMode } from '../../shared/types'

export type SupportedLocale = 'en' | 'nb'

export function resolveLocale(preference?: LanguageMode | string): SupportedLocale {
  if (preference === 'nb') return 'nb'
  if (preference === 'en') return 'en'

  // Default to OS language
  const navLang = typeof navigator !== 'undefined' ? (navigator.language || '').toLowerCase() : ''
  if (navLang.startsWith('nb') || navLang.startsWith('no') || navLang.startsWith('nn')) {
    return 'nb'
  }
  return 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: resolveLocale('system'),
  fallbackLocale: 'en',
  messages: {
    en,
    nb
  }
})

export function resolveDateLocale(
  preference?: LanguageMode | string,
  systemDateLocale?: string
): string | undefined {
  if (preference === 'nb') return 'nb-NO'
  if (preference === 'en') return 'en-US'
  return systemDateLocale || undefined
}

export function setAppLanguage(preference: LanguageMode | string): void {
  const resolved = resolveLocale(preference)
  i18n.global.locale.value = resolved
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', resolved)
  }
}

