import { describe, it, expect } from 'vitest'
import { normalizeSystemDateLocale } from '@shared/locale'

describe('normalizeSystemDateLocale', () => {
  it('replaces every underscore and keeps a valid locale', () => {
    expect(normalizeSystemDateLocale('en_US.UTF-8')).toBe('en-US')
    expect(normalizeSystemDateLocale('zh_Hant_TW.UTF-8')).toBe('zh-Hant-TW')
    expect(normalizeSystemDateLocale('nb_NO@collation=standard')).toBe('nb-NO')
  })

  it('returns undefined for missing or malformed locales', () => {
    expect(normalizeSystemDateLocale(undefined)).toBeUndefined()
    expect(normalizeSystemDateLocale('not-a-locale')).toBeUndefined()
  })
})
