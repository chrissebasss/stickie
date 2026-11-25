import { describe, it, expect } from 'vitest'
import { isNewerVersion, getLatestReleaseVersion } from '@shared/version'

describe('isNewerVersion', () => {
  it('detects newer patch, minor, and major versions', () => {
    expect(isNewerVersion('0.1.1', '0.1.0')).toBe(true)
    expect(isNewerVersion('0.2.0', '0.1.9')).toBe(true)
    expect(isNewerVersion('1.0.0', '0.9.9')).toBe(true)
    expect(isNewerVersion('v0.1.2', '0.1.1')).toBe(true)
  })

  it('returns false for same or older versions', () => {
    expect(isNewerVersion('0.1.0', '0.1.0')).toBe(false)
    expect(isNewerVersion('0.1.0', '0.1.1')).toBe(false)
    expect(isNewerVersion('0.1.9', '0.2.0')).toBe(false)
  })

  it('treats a stable release as newer than a prerelease of the same version', () => {
    expect(isNewerVersion('1.2.0', '1.2.0-beta')).toBe(true)
    expect(isNewerVersion('1.2.0-beta', '1.2.0')).toBe(false)
  })

  it('orders prerelease identifiers', () => {
    expect(isNewerVersion('1.2.0-beta.2', '1.2.0-beta.1')).toBe(true)
    expect(isNewerVersion('1.2.0-beta', '1.2.0-alpha')).toBe(true)
  })
})

describe('getLatestReleaseVersion', () => {
  it('reads the version from a GitHub release tag', () => {
    expect(getLatestReleaseVersion({ tag_name: 'v0.1.3' })).toBe('v0.1.3')
    expect(getLatestReleaseVersion({ tag_name: '  0.2.0  ' })).toBe('0.2.0')
  })

  it('rejects empty, missing and malformed release payloads', () => {
    expect(getLatestReleaseVersion({ tag_name: '' })).toBeNull()
    expect(getLatestReleaseVersion({})).toBeNull()
    expect(getLatestReleaseVersion(null)).toBeNull()
    expect(getLatestReleaseVersion({ tag_name: 123 })).toBeNull()
  })
})
