import { createI18n } from 'vue-i18n'
import type { LanguageMode } from '../../shared/types'

type LocaleMeta = { code: string; name: string; intlLocale: string }
type LocaleModule = { default: Record<string, unknown> & { _meta?: LocaleMeta } }

const modules = import.meta.glob<LocaleModule>('../locales/*.json', { eager: true })

const messages: Record<string, Record<string, unknown>> = Object.fromEntries(
  Object.entries(modules).map(([path, module]) => [
    path.split('/').pop()!.replace(/\.json$/, ''),
    module.default
  ])
)

export type SupportedLocale = string

export const availableLocales: string[] = Object.keys(messages).sort((a, b) =>
  a === 'en' ? -1 : b === 'en' ? 1 : a.localeCompare(b)
)

function metaFor(code: string): LocaleMeta | undefined {
  return messages[code]?._meta as LocaleMeta | undefined
}

export function localeName(code: string): string {
  return metaFor(code)?.name || code
}

export function resolveLocale(preference?: LanguageMode | string): SupportedLocale {
  const requested = typeof preference === 'string' ? preference : ''
  if (requested && requested !== 'system' && requested in messages) return requested

  const navLang = typeof navigator !== 'undefined' ? (navigator.language || '').toLowerCase() : ''
  const osCode = navLang.split('-')[0]
  if (osCode === 'no' || osCode === 'nn') return 'nb'
  if (osCode && osCode in messages) return osCode
  return 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: resolveLocale('system'),
  fallbackLocale: 'en',
  messages: messages as never
})

export function resolveDateLocale(
  preference?: LanguageMode | string,
  systemDateLocale?: string
): string | undefined {
  const code = typeof preference === 'string' ? preference : ''
  if (code && code !== 'system' && code in messages) {
    return metaFor(code)?.intlLocale || systemDateLocale
  }
  return systemDateLocale || undefined
}

export function setAppLanguage(preference: LanguageMode | string): void {
  const resolved = resolveLocale(preference)
  i18n.global.locale.value = resolved
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', resolved)
  }
}
