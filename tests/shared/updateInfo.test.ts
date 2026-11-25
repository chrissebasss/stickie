import { describe, it, expect } from 'vitest'
import { clampProgress, mapUpdateInfo, shouldBypassQuitGuard } from '@shared/updateInfo'

const fallbackUrl = 'https://github.com/chrissebasss/stickie/releases/latest'

describe('mapUpdateInfo', () => {
  it('reports a newer remote version as an available update', () => {
    const result = mapUpdateInfo({ version: '9.9.9' }, '0.1.3', fallbackUrl)

    expect(result.hasUpdate).toBe(true)
    expect(result.latestVersion).toBe('9.9.9')
    expect(result.error).toBeUndefined()
  })

  it('reports no update when the remote version matches the current one', () => {
    const result = mapUpdateInfo({ version: '0.1.3' }, '0.1.3', fallbackUrl)

    expect(result.hasUpdate).toBe(false)
    expect(result.error).toBeUndefined()
  })

  it('reports an error and keeps the current version when no version is available', () => {
    expect(mapUpdateInfo(null, '0.1.3', fallbackUrl)).toMatchObject({
      error: true,
      latestVersion: '0.1.3'
    })
    expect(mapUpdateInfo({ version: '' }, '0.1.3', fallbackUrl)).toMatchObject({
      error: true,
      latestVersion: '0.1.3'
    })
    expect(mapUpdateInfo({ version: '   ' }, '0.1.3', fallbackUrl)).toMatchObject({
      error: true,
      latestVersion: '0.1.3'
    })
  })

  it('trims whitespace around a version from metadata', () => {
    const result = mapUpdateInfo({ version: ' 9.9.9 ' }, '0.1.3', fallbackUrl)

    expect(result.latestVersion).toBe('9.9.9')
    expect(result.hasUpdate).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('prefers a provided release notes URL over the fallback', () => {
    const releaseNotesUrl = 'https://example.com/stickie/releases/v9.9.9'

    const result = mapUpdateInfo(
      { version: '9.9.9', releaseNotesUrl },
      '0.1.3',
      fallbackUrl
    )

    expect(result.releaseUrl).toBe(releaseNotesUrl)
  })
})

describe('clampProgress', () => {
  it('clamps progress to the 0-100 range', () => {
    expect(clampProgress(-5)).toBe(0)
    expect(clampProgress(150)).toBe(100)
    expect(clampProgress(42)).toBe(42)
  })
})

describe('shouldBypassQuitGuard', () => {
  it('returns whether an update is installing', () => {
    expect(shouldBypassQuitGuard(true)).toBe(true)
    expect(shouldBypassQuitGuard(false)).toBe(false)
  })
})
