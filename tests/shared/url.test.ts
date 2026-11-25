import { describe, it, expect } from 'vitest'
import { isAllowedExternalUrl } from '@shared/url'

describe('isAllowedExternalUrl', () => {
  it('accepts Stickie links on github.com over HTTPS', () => {
    expect(isAllowedExternalUrl('https://github.com/chrissebasss/stickie/releases/latest')).toBe(true)
  })

  it('rejects other schemes, hosts, repositories, credentials and malformed URLs', () => {
    expect(isAllowedExternalUrl('http://github.com/chrissebasss/stickie/')).toBe(false)
    expect(isAllowedExternalUrl('https://github.com.evil.com/chrissebasss/stickie/')).toBe(false)
    expect(isAllowedExternalUrl('https://github.com/other/repo/')).toBe(false)
    expect(isAllowedExternalUrl('https://user@github.com/chrissebasss/stickie/')).toBe(false)
    expect(isAllowedExternalUrl('not a url')).toBe(false)
  })
})
