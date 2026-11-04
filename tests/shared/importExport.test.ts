import { describe, it, expect } from 'vitest'
import {
  parseTxtToNote,
  parseMdToNote,
  parseHtmlToNote,
  parseStickieJson,
  exportNoteToMarkdown,
  exportNoteToJson
} from '@shared/importExport'
import type { Note } from '@shared/types'

describe('import / export helpers', () => {
  it('imports .txt file to note structure', () => {
    const raw = 'Meeting Notes\n1. First item\n2. Second item'
    const parsed = parseTxtToNote(raw, 'notes.txt')
    expect(parsed.title).toBe('Meeting Notes')
    expect(parsed.plainText).toBe(raw)
    expect(parsed.content.type).toBe('doc')
    expect(parsed.content.content?.length).toBe(3)
  })

  it('imports markdown headings and lists', () => {
    const raw = '# Grocery List\n- Apples\n- Oranges\n\nSome paragraph'
    const parsed = parseMdToNote(raw, 'groceries.md')
    expect(parsed.title).toBe('Grocery List')
    expect(parsed.content.type).toBe('doc')
    // Should have heading, bullet list, and paragraph
    expect(parsed.content.content?.some((n) => n.type === 'heading')).toBe(true)
    expect(parsed.content.content?.some((n) => n.type === 'bulletList')).toBe(true)
  })

  it('imports html and strips dangerous tags (scripts)', () => {
    const raw = '<h3>Project Plan</h3><p>Hello <script>alert(1)</script>World</p>'
    const parsed = parseHtmlToNote(raw, 'plan.html')
    expect(parsed.title).toBe('Project Plan')
    expect(parsed.plainText).not.toContain('<script>')
    expect(parsed.plainText).not.toContain('alert(1)')
  })

  it('parses valid Stickie JSON export', () => {
    const validJson = JSON.stringify({
      schemaVersion: 1,
      id: 'abc',
      title: 'Imported Note',
      createdAt: 1000,
      updatedAt: 2000,
      color: { kind: 'preset', id: 'pink' },
      bounds: { x: 50, y: 50, width: 300, height: 300 },
      content: { type: 'doc' },
      plainText: 'Imported Note'
    })

    const parsed = parseStickieJson(validJson)
    expect(parsed).not.toBeNull()
    expect(parsed?.title).toBe('Imported Note')
  })

  it('exports note to markdown', () => {
    const note: Note = {
      schemaVersion: 1,
      id: 'test',
      title: 'My Heading',
      createdAt: 1000,
      updatedAt: 2000,
      color: { kind: 'preset', id: 'yellow' },
      bounds: { x: 0, y: 0, width: 300, height: 300 },
      content: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'My Heading' }]
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Some text content' }]
          }
        ]
      },
      plainText: 'My Heading\nSome text content'
    }

    const md = exportNoteToMarkdown(note)
    expect(md).toContain('# My Heading')
    expect(md).toContain('Some text content')
  })
})

