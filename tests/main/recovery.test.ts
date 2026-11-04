import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { NoteStore } from '@main/store/noteStore'
import type { Note } from '@shared/types'

describe('Hardening: Kill & Crash Recovery', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await fs.mkdtemp(join(tmpdir(), 'stikly-test-recovery-'))
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it('survives mid-edit emergency exit with zero data loss', async () => {
    // 1. First session
    const store1 = new NoteStore(testDir, { debounceMs: 5000 }) // Long debounce
    await store1.init()

    const note: Note = {
      schemaVersion: 1,
      id: 'active-note',
      title: 'Initial Title',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color: { kind: 'preset', id: 'yellow' },
      bounds: { x: 100, y: 100, width: 300, height: 300 },
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Important unsaved edit' }] }] },
      plainText: 'Important unsaved edit'
    }

    // Queue save into debounce map (would normally wait 5 seconds)
    store1.queueSave(note)

    // Abrupt termination signal (SIGTERM/before-quit handler calls flush)
    await store1.flush()

    // 2. Second session (simulating relaunch after kill)
    const store2 = new NoteStore(testDir)
    await store2.init()

    const reloaded = await store2.getNote('active-note')
    expect(reloaded).not.toBeNull()
    expect(reloaded?.plainText).toBe('Important unsaved edit')
    expect(reloaded?.title).toBe('Important unsaved edit')
    expect(store2.getIndex().some((item) => item.id === 'active-note')).toBe(true)
  })

  it('recovers last known good state from .bak when primary file is severely corrupted', async () => {
    const store1 = new NoteStore(testDir)
    await store1.init()

    const note: Note = {
      schemaVersion: 1,
      id: 'corrupted-note',
      title: 'Good Data',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color: { kind: 'preset', id: 'blue' },
      bounds: { x: 50, y: 50, width: 300, height: 300 },
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Good Data content' }] }] },
      plainText: 'Good Data content'
    }

    // Save initial version
    await store1.saveNoteNow(note)

    // Save updated version to produce .bak of first version
    await store1.saveNoteNow({ ...note, plainText: 'Second version' })

    // Simulate power-cut truncation of primary file
    const noteFilePath = join(testDir, 'notes', 'corrupted-note.json')
    await fs.writeFile(noteFilePath, '{"incomplete": true, ')

    // Restart app
    const store2 = new NoteStore(testDir)
    await store2.init()

    // Must not crash and must safely restore from .bak
    const recovered = await store2.getNote('corrupted-note')
    expect(recovered).not.toBeNull()
    expect(recovered?.plainText).toBe('Good Data content')
  })
})

