import { describe, it, expect } from 'vitest'
import { deriveTitle, isNoteEmpty } from '@shared/title'
import type { JSONContent } from '@tiptap/vue-3'

describe('deriveTitle', () => {
  it('returns Untitled note for empty string', () => {
    expect(deriveTitle('')).toBe('Untitled note')
    expect(deriveTitle('   \n  \n\t ')).toBe('Untitled note')
  })

  it('uses first non-empty line of plain text', () => {
    const text = '\n\n  Meeting with team  \nSecond line'
    expect(deriveTitle(text)).toBe('Meeting with team')
  })

  it('collapses multiple whitespace characters', () => {
    const text = 'Hello    world   from    Stikly'
    expect(deriveTitle(text)).toBe('Hello world from Stikly')
  })

  it('truncates at 60 characters and appends ellipsis', () => {
    const longText = 'This is a very long note title that exceeds sixty characters easily because it keeps going and going'
    const title = deriveTitle(longText)
    expect(title.length).toBeLessThanOrEqual(63) // 60 chars + '...'
    expect(title.endsWith('...')).toBe(true)
    expect(title.startsWith('This is a very long note title')).toBe(true)
  })

  it('handles image-only note when hasImages is true', () => {
    expect(deriveTitle('', true)).toBe('Untitled note')
  })
})

describe('isNoteEmpty', () => {
  it('returns true when plainText is empty and no images exist', () => {
    const emptyDoc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph'
        }
      ]
    }
    expect(isNoteEmpty('', emptyDoc)).toBe(true)
    expect(isNoteEmpty('   \n  ', emptyDoc)).toBe(true)
  })

  it('returns false when plain text exists', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello' }]
        }
      ]
    }
    expect(isNoteEmpty('Hello', doc)).toBe(false)
  })

  it('returns false when document contains an image node even if plainText is empty', () => {
    const imageDoc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'image',
          attrs: { src: 'stikly-asset://abc/def.png' }
        }
      ]
    }
    expect(isNoteEmpty('', imageDoc)).toBe(false)
  })
})

