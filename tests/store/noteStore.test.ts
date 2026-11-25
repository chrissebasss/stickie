import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { NoteStore } from '@main/store/noteStore'
import type { Note } from '@shared/types'

function makeNote(id: string, plainText: string): Note {
  return {
    schemaVersion: 1,
    id,
    title: plainText,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    color: { kind: 'preset', id: 'yellow' },
    bounds: { x: 0, y: 0, width: 300, height: 300 },
    content: { type: 'doc' },
    plainText
  }
}

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

  it('refuses to delete files outside the notes directory', async () => {
    const outside = join(testDir, 'outside.json')
    await fs.writeFile(outside, 'keep me')

    await expect(store.deleteNote('../outside')).rejects.toThrow(/invalid note id/i)
    await expect(fs.access(outside)).resolves.toBeUndefined()
  })

  it('refuses to write notes outside the notes directory', async () => {
    await expect(store.saveNoteNow(makeNote('../escape', 'text'))).rejects.toThrow(/invalid note id/i)
    await expect(fs.access(join(testDir, 'escape.json'))).rejects.toThrow()
  })

  it('returns the pending note while its debounced write is blocked', async () => {
    const base = makeNote('race-note', 'old text')
    await store.saveNoteNow(base)

    const realOpen = fs.open
    let gate: Promise<void> | null = null
    const openSpy = vi.spyOn(fs, 'open')
    openSpy.mockImplementation(((...args: Parameters<typeof fs.open>) =>
      gate ? gate.then(() => realOpen(...args)) : realOpen(...args)) as typeof fs.open)

    let unblock = (): void => {}
    gate = new Promise<void>((resolve) => { unblock = resolve })

    try {
      store.queueSave({ ...base, plainText: 'new text' })

      const deadline = Date.now() + 2000
      while (openSpy.mock.calls.length === 0 && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 5))
      }
      expect(openSpy).toHaveBeenCalled()

      const duringWrite = await store.getNote('race-note')
      expect(duringWrite?.plainText).toBe('new text')
    } finally {
      gate = null
      unblock()
      openSpy.mockRestore()
    }

    await store.flush()
    expect((await store.getNote('race-note'))?.plainText).toBe('new text')
  })

  it('flush writes saves queued while the flush is still running', async () => {
    const slowStore = new NoteStore(testDir, { debounceMs: 5000 })
    await slowStore.init()
    const base = makeNote('flush-race', 'first')
    await slowStore.saveNoteNow(base)

    const realOpen = fs.open
    let gate: Promise<void> | null = null
    const openSpy = vi.spyOn(fs, 'open')
    openSpy.mockImplementation(((...args: Parameters<typeof fs.open>) =>
      gate ? gate.then(() => realOpen(...args)) : realOpen(...args)) as typeof fs.open)

    let unblock = (): void => {}
    gate = new Promise<void>((resolve) => { unblock = resolve })

    try {
      slowStore.queueSave({ ...base, plainText: 'second' })
      const flushing = slowStore.flush()

      const deadline = Date.now() + 2000
      while (openSpy.mock.calls.length === 0 && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 5))
      }
      expect(openSpy).toHaveBeenCalled()

      slowStore.queueSave({ ...base, plainText: 'third' })
      gate = null
      unblock()
      await flushing
    } finally {
      gate = null
      unblock()
      openSpy.mockRestore()
    }

    const raw = await fs.readFile(join(testDir, 'notes', 'flush-race.json'), 'utf-8')
    expect((JSON.parse(raw) as Note).plainText).toBe('third')
    await slowStore.flush()
  })
})

