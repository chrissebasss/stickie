import type { JSONContent } from '@tiptap/vue-3'
import type { Note } from './types'
import { deriveTitle } from './title'

export interface ParsedNoteResult {
  title: string
  plainText: string
  content: JSONContent
}

export function parseTxtToNote(rawText: string, filename?: string): ParsedNoteResult {
  const plainText = rawText.trim()
  const title = deriveTitle(plainText) || (filename ? filename.replace(/\.[^/.]+$/, '') : 'Untitled note')
  const lines = rawText.split(/\r?\n/)

  const content: JSONContent = {
    type: 'doc',
    content: lines.map((line) => {
      const trimmed = line.trim()
      return {
        type: 'paragraph',
        content: trimmed ? [{ type: 'text', text: line }] : []
      }
    })
  }

  return { title, plainText, content }
}

export function parseMdToNote(rawMd: string, filename?: string): ParsedNoteResult {
  const plainText = rawMd.trim()
  const firstLineClean = plainText.replace(/^#{1,6}\s+/, '')
  const title = deriveTitle(firstLineClean) || (filename ? filename.replace(/\.[^/.]+$/, '') : 'Untitled note')
  const lines = rawMd.split(/\r?\n/)

  const nodes: JSONContent[] = []
  let currentList: { type: 'bulletList' | 'orderedList' | 'taskList'; items: JSONContent[] } | null = null

  const flushList = () => {
    if (currentList) {
      nodes.push({
        type: currentList.type,
        content: currentList.items
      })
      currentList = null
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()

    // Heading (#, ##, ###)
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/)
    if (headingMatch) {
      flushList()
      const level = headingMatch[1].length
      const text = headingMatch[2]
      nodes.push({
        type: 'heading',
        attrs: { level },
        content: text ? [{ type: 'text', text }] : []
      })
      continue
    }

    // Task item (- [ ] or - [x])
    const taskMatch = trimmed.match(/^-\s+\[([ xX])\]\s+(.*)$/)
    if (taskMatch) {
      if (!currentList || currentList.type !== 'taskList') {
        flushList()
        currentList = { type: 'taskList', items: [] }
      }
      const checked = taskMatch[1].toLowerCase() === 'x'
      const text = taskMatch[2]
      currentList.items.push({
        type: 'taskItem',
        attrs: { checked },
        content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }]
      })
      continue
    }

    // Bullet list (- or *)
    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/)
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'bulletList') {
        flushList()
        currentList = { type: 'bulletList', items: [] }
      }
      const text = bulletMatch[1]
      currentList.items.push({
        type: 'listItem',
        content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }]
      })
      continue
    }

    // Ordered list (1. ...)
    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/)
    if (orderedMatch) {
      if (!currentList || currentList.type !== 'orderedList') {
        flushList()
        currentList = { type: 'orderedList', items: [] }
      }
      const text = orderedMatch[1]
      currentList.items.push({
        type: 'listItem',
        content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }]
      })
      continue
    }

    // Standard paragraph or empty line
    flushList()
    nodes.push({
      type: 'paragraph',
      content: trimmed ? [{ type: 'text', text: line }] : []
    })
  }

  flushList()

  return {
    title,
    plainText,
    content: {
      type: 'doc',
      content: nodes.length > 0 ? nodes : [{ type: 'paragraph' }]
    }
  }
}

export function parseHtmlToNote(rawHtml: string, filename?: string): ParsedNoteResult {
  // Strip dangerous tags: script, style, iframe, object, embed
  const sanitized = rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')

  // Preserve newlines on closing block tags
  const withLineBreaks = sanitized.replace(/<\/(?:p|h[1-6]|div|li|tr|blockquote)>/gi, '\n')
  const textContent = withLineBreaks
    .replace(/<[^>]+>/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()

  const title = deriveTitle(textContent) || (filename ? filename.replace(/\.[^/.]+$/, '') : 'Untitled note')

  // Simple paragraph conversion
  const paragraphs = sanitized
    .split(/<\/(?:p|h[1-6]|div|li)>/i)
    .map((p) => p.replace(/<[^>]+>/g, '').trim())
    .filter((p) => p.length > 0)

  const content: JSONContent = {
    type: 'doc',
    content:
      paragraphs.length > 0
        ? paragraphs.map((text) => ({
            type: 'paragraph',
            content: [{ type: 'text', text }]
          }))
        : [{ type: 'paragraph', content: textContent ? [{ type: 'text', text: textContent }] : [] }]
  }

  return {
    title,
    plainText: textContent,
    content
  }
}

export function parseStiklyJson(rawJson: string): Partial<Note> | null {
  try {
    const data = JSON.parse(rawJson)
    if (data && typeof data === 'object') {
      return data
    }
    return null
  } catch {
    return null
  }
}

export function exportNoteToMarkdown(note: Note): string {
  if (!note.content || !note.content.content) {
    return note.plainText || ''
  }

  const lines: string[] = []

  function traverse(node: JSONContent): string {
    if (node.type === 'text') {
      let t = node.text || ''
      if (node.marks) {
        for (const mark of node.marks) {
          if (mark.type === 'bold') t = `**${t}**`
          if (mark.type === 'italic') t = `*${t}*`
          if (mark.type === 'strike') t = `~~${t}~~`
          if (mark.type === 'underline') t = `<u>${t}</u>`
        }
      }
      return t
    }

    if (node.type === 'paragraph') {
      const inner = (node.content || []).map(traverse).join('')
      return inner
    }

    if (node.type === 'heading') {
      const level = node.attrs?.level || 1
      const inner = (node.content || []).map(traverse).join('')
      return `${'#'.repeat(level)} ${inner}`
    }

    if (node.type === 'taskItem') {
      const checked = node.attrs?.checked ? '[x]' : '[ ]'
      const inner = (node.content || []).map(traverse).join(' ')
      return `- ${checked} ${inner}`
    }

    if (node.type === 'listItem') {
      const inner = (node.content || []).map(traverse).join(' ')
      return `- ${inner}`
    }

    if (node.type === 'image') {
      return `![image](${node.attrs?.src || ''})`
    }

    return (node.content || []).map(traverse).join('\n')
  }

  for (const topNode of note.content.content) {
    lines.push(traverse(topNode))
  }

  return lines.join('\n\n')
}

export function exportNoteToJson(note: Note): string {
  return JSON.stringify(note, null, 2)
}
