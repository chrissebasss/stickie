import type { JSONContent } from '@tiptap/vue-3'

const MAX_TITLE_LENGTH = 60
export const DEFAULT_UNTITLED = 'Untitled note'

/**
 * Derives a note title from the first non-empty line of plain text.
 * Collapses whitespace and truncates at ~60 characters with an ellipsis.
 */
export function deriveTitle(plainText: string, hasImages = false): string {
  if (!plainText || typeof plainText !== 'string') {
    return DEFAULT_UNTITLED
  }

  const lines = plainText.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.replace(/\s+/g, ' ').trim()
    if (trimmed.length > 0) {
      if (trimmed.length > MAX_TITLE_LENGTH) {
        return trimmed.slice(0, MAX_TITLE_LENGTH) + '...'
      }
      return trimmed
    }
  }

  return DEFAULT_UNTITLED
}

/**
 * Checks if a note has any content (text or images).
 * A note is empty if plainText is blank and no image nodes exist in the TipTap doc.
 */
export function isNoteEmpty(plainText: string, content?: JSONContent): boolean {
  if (plainText && plainText.trim().length > 0) {
    return false
  }

  if (content && hasImageNodes(content)) {
    return false
  }

  return true
}

function hasImageNodes(node: JSONContent): boolean {
  if (node.type === 'image') {
    return true
  }
  if (node.content && Array.isArray(node.content)) {
    return node.content.some((child) => hasImageNodes(child))
  }
  return false
}
