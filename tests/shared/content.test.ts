import { describe, it, expect } from 'vitest'
import { stableStringify } from '@shared/content'

describe('stableStringify', () => {
  it('sorts object keys so equal content compares the same', () => {
    expect(stableStringify({ b: 2, a: 1 })).toBe(stableStringify({ a: 1, b: 2 }))
  })

  it('sorts nested object keys but preserves array order', () => {
    const first = { attrs: { src: 'x', alt: 'y' }, content: [1, 2] }
    const second = { content: [1, 2], attrs: { alt: 'y', src: 'x' } }
    expect(stableStringify(first)).toBe(stableStringify(second))
    expect(stableStringify([2, 1])).not.toBe(stableStringify([1, 2]))
  })

  it('omits undefined values like JSON.stringify', () => {
    expect(stableStringify({ a: 1, b: undefined })).toBe(stableStringify({ a: 1 }))
  })
})
