import { dialog } from 'electron'
import { promises as fs } from 'fs'
import { basename, extname } from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { Note } from '../shared/types'
import type { NoteStore } from './store/noteStore'
import {
  parseTxtToNote,
  parseMdToNote,
  parseHtmlToNote,
  parseStiklyJson,
  exportNoteToMarkdown,
  exportNoteToJson
} from '../shared/importExport'

export async function importFilesFromDisk(noteStore: NoteStore): Promise<string[]> {
  const result = await dialog.showOpenDialog({
    title: 'Import Notes',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Supported Files', extensions: ['txt', 'md', 'markdown', 'html', 'json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (result.canceled || result.filePaths.length === 0) {
    return []
  }

  const createdIds: string[] = []

  for (const filePath of result.filePaths) {
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      const ext = extname(filePath).toLowerCase()
      const fileName = basename(filePath)
      const now = Date.now()

      let noteData: Partial<Note> = {}

      if (ext === '.json') {
        const parsed = parseStiklyJson(raw)
        if (parsed) {
          noteData = parsed
        } else {
          // If not Stikly JSON, treat as raw text
          noteData = parseTxtToNote(raw, fileName)
        }
      } else if (ext === '.md' || ext === '.markdown') {
        noteData = parseMdToNote(raw, fileName)
      } else if (ext === '.html') {
        noteData = parseHtmlToNote(raw, fileName)
      } else {
        noteData = parseTxtToNote(raw, fileName)
      }

      const newNote: Note = {
        schemaVersion: 1,
        id: uuidv4(),
        title: noteData.title || fileName,
        createdAt: now,
        updatedAt: now,
        color: noteData.color || { kind: 'preset', id: 'yellow' },
        bounds: noteData.bounds || { x: 120, y: 120, width: 320, height: 360 },
        content: noteData.content || { type: 'doc', content: [{ type: 'paragraph' }] },
        plainText: noteData.plainText || '',
        alwaysOnTop: noteData.alwaysOnTop ?? false
      }

      await noteStore.saveNoteNow(newNote)
      createdIds.push(newNote.id)
    } catch (err) {
      console.error(`[Import] Error importing ${filePath}:`, err)
    }
  }

  return createdIds
}

export async function exportNoteToFile(
  noteStore: NoteStore,
  noteId: string,
  format: 'json' | 'md'
): Promise<boolean> {
  const note = await noteStore.getNote(noteId)
  if (!note) return false

  const defaultExt = format === 'md' ? 'md' : 'json'
  const safeTitle = (note.title || 'untitled').replace(/[^a-z0-9_-]/gi, '_').slice(0, 30)

  const result = await dialog.showSaveDialog({
    title: `Export Note (${format.toUpperCase()})`,
    defaultPath: `${safeTitle}.${defaultExt}`,
    filters: [
      format === 'md'
        ? { name: 'Markdown', extensions: ['md'] }
        : { name: 'JSON', extensions: ['json'] }
    ]
  })

  if (result.canceled || !result.filePath) {
    return false
  }

  let content = ''
  if (format === 'md') {
    content = exportNoteToMarkdown(note)
  } else {
    content = exportNoteToJson(note)
  }

  await fs.writeFile(result.filePath, content, 'utf-8')
  return true
}

