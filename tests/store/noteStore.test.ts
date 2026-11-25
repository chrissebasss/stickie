import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { NoteStore } from '@main/store/noteStore'
import type { Note } from '@shared/types'

describe('NoteStore', () => {
  let testDir: string
  let store: NoteStore

  beforeEach(async () => {
    testDir = await fs.mkdtemp(join(tmpdir(), 'stickie-test-notes-'))
    store = new NoteStore(testDir, { debounceMs: 50 })
    await store.init()
  })

  afterEach(async () => {
    await store.flush()
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it('creates and saves a note with derived title and in-memory index', async () => {
    const note: Note = {
      schemaVersion: 1,
      id: 'note-1',
      title: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color: { kind: 'preset', id: 'yellow' },
      bounds: { x: 100, y: 100, width: 300, height: 300 },
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Shopping List\n- Milk\n- Bread' }]
          }
        ]
      },
      plainText: 'Shopping List\n- Milk\n- Bread'
    }

    await store.saveNoteNow(note)

    // Check in-memory index
    const index = store.getIndex()
    expect(index.length).toBe(1)
    expect(index[0].id).toBe('note-1')
    expect(index[0].title).toBe('Shopping List')

    // Read full note from disk
    const reloaded = await store.getNote('note-1')
    expect(reloaded).not.toBeNull()
    expect(reloaded?.title).toBe('Shopping List')
    expect(reloaded?.plainText).toBe('Shopping List\n- Milk\n- Bread')
  })

  it('debounces multiple rapid edits and persists final state on flush', async () => {
    const baseNote: Note = {
      schemaVersion: 1,
      id: 'note-debounce',
      title: 'Initial',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color: { kind: 'preset', id: 'green' },
      bounds: { x: 50, y: 50, width: 250, height: 250 },
      content: { type: 'doc' },
      plainText: 'Draft 1'
    }

    store.queueSave(baseNote)
    store.queueSave({ ...baseNote, plainText: 'Draft 2' })
    store.queueSave({ ...baseNote, plainText: 'Final text for note' })

    // Force flush
    await store.flush()

    const diskNote = await store.getNote('note-debounce')
    expect(diskNote?.plainText).toBe('Final text for note')
    expect(diskNote?.title).toBe('Final text for note')
  })

  it('discards empty notes on close', async () => {
    const emptyNote: Note = {
      schemaVersion: 1,
      id: 'note-empty',
      title: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color: { kind: 'preset', id: 'yellow' },
      bounds: { x: 0, y: 0, width: 300, height: 300 },
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      plainText: '   \n  '
    }

    const discarded = await store.discardIfEmpty(emptyNote)
    expect(discarded).toBe(true)

    const diskNote = await store.getNote('note-empty')
    expect(diskNote).toBeNull()
    expect(store.getIndex().length).toBe(0)
  })

  it('does NOT discard note on close if it contains text or images', async () => {
    const nonEmptyNote: Note = {
      schemaVersion: 1,
      id: 'note-keep',
      title: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color: { kind: 'preset', id: 'blue' },
      bounds: { x: 0, y: 0, width: 300, height: 300 },
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Important idea' }] }] },
      plainText: 'Important idea'
    }

    const discarded = await store.discardIfEmpty(nonEmptyNote)
    expect(discarded).toBe(false)

    const diskNote = await store.getNote('note-keep')
    expect(diskNote).not.toBeNull()
    expect(diskNote?.plainText).toBe('Important idea')
  })

  it('deletes note and removes from index', async () => {
    const note: Note = {
      schemaVersion: 1,
      id: 'to-delete',
      title: 'Delete me',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color: { kind: 'preset', id: 'pink' },
      bounds: { x: 0, y: 0, width: 300, height: 300 },
      content: { type: 'doc' },
      plainText: 'Delete me'
    }

    await store.saveNoteNow(note)
    expect(store.getIndex().length).toBe(1)

    await store.deleteNote('to-delete')
    expect(store.getIndex().length).toBe(0)
    expect(await store.getNote('to-delete')).toBeNull()
  })

  it('recovers note from .bak if note json is corrupt on startup/reload', async () => {
    const note: Note = {
      schemaVersion: 1,
      id: 'recoverable',
      title: 'Original Title',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color: { kind: 'preset', id: 'yellow' },
      bounds: { x: 0, y: 0, width: 300, height: 300 },
      content: { type: 'doc' },
      plainText: 'Original text'
    }

    await store.saveNoteNow(note)
    await store.saveNoteNow({ ...note, plainText: 'Updated text' })

    // Corrupt primary file
    const noteFile = join(testDir, 'notes', 'recoverable.json')
    await fs.writeFile(noteFile, 'CORRUPT_BYTES')

    const reloaded = await store.getNote('recoverable')
    expect(reloaded).not.toBeNull()
    expect(reloaded?.plainText).toBe('Original text')
  })

  it('serializes concurrent saveNoteNow calls on the same note', async () => {
    const base: Note = {
      schemaVersion: 1,
      id: 'concurrent',
      title: 'Concurrent',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color: { kind: 'preset', id: 'yellow' },
      bounds: { x: 0, y: 0, width: 300, height: 300 },
      content: { type: 'doc' },
      plainText: 'v0'
    }

    await Promise.all([
      store.saveNoteNow({ ...base, plainText: 'v1' }),
      store.saveNoteNow({ ...base, plainText: 'v2' }),
      store.saveNoteNow({ ...base, plainText: 'v3' })
    ])

    const reloaded = await store.getNote('concurrent')
    expect(reloaded?.plainText).toBe('v3')
  })

  it('preserves updatedAt when touchUpdatedAt is false', async () => {
    const originalUpdatedAt = 1_700_000_000_000
    const note: Note = {
      schemaVersion: 1,
      id: 'bounds-only',
      title: 'Bounds Only',
      createdAt: originalUpdatedAt - 10_000,
      updatedAt: originalUpdatedAt,
      color: { kind: 'preset', id: 'yellow' },
      bounds: { x: 10, y: 10, width: 300, height: 300 },
      content: { type: 'doc' },
      plainText: 'Bounds Only'
    }

    await store.saveNoteNow(note, { touchUpdatedAt: false })
    const afterBoundsSave = await store.getNote('bounds-only')
    expect(afterBoundsSave?.updatedAt).toBe(originalUpdatedAt)

    await store.saveNoteNow({ ...note, plainText: 'Edited' }, { touchUpdatedAt: true })
    const afterEdit = await store.getNote('bounds-only')
    expect(afterEdit?.updatedAt).toBeGreaterThan(originalUpdatedAt)
  })
})

