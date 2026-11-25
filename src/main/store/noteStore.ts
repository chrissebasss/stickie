import { promises as fs } from 'fs'
import { join } from 'path'
import type { Note, NoteIndexItem } from '../../shared/types'
import { deriveTitle, isNoteEmpty } from '../../shared/title'
import { writeAtomic, readJsonWithBackup, removeFileAndBackup } from './atomicFile'
import { extractReferencedAssetFiles, cleanOrphanAssets, isValidNoteId } from './assets'

export interface NoteStoreOptions {
  debounceMs?: number
}

export class NoteStore {
  public readonly baseDir: string
  private debounceMs: number
  private index: Map<string, NoteIndexItem> = new Map()
  private pendingSaves: Map<string, { note: Note; timer: NodeJS.Timeout }> = new Map()
  private writeQueues: Map<string, Promise<void>> = new Map()
  private indexListeners: Set<(items: NoteIndexItem[]) => void> = new Set()

  constructor(baseDir: string, options?: NoteStoreOptions) {
    this.baseDir = baseDir
    this.debounceMs = options?.debounceMs ?? 500
  }

  public get notesDir(): string {
    return join(this.baseDir, 'notes')
  }

  public get assetsDir(): string {
    return join(this.baseDir, 'assets')
  }

  public getNotePath(id: string): string {
    if (!isValidNoteId(id)) throw new Error('Invalid note id')
    return join(this.notesDir, `${id}.json`)
  }

  public getNoteAssetsDir(id: string): string {
    if (!isValidNoteId(id)) throw new Error('Invalid note id')
    return join(this.assetsDir, id)
  }

  public async init(): Promise<void> {
    await fs.mkdir(this.notesDir, { recursive: true })
    await fs.mkdir(this.assetsDir, { recursive: true })

    const entries = await fs.readdir(this.notesDir, { withFileTypes: true })
    this.index.clear()

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json') && !entry.name.endsWith('.bak')) {
        const filePath = join(this.notesDir, entry.name)
        const result = await readJsonWithBackup<Note>(filePath)
        if (result && result.data && result.data.id) {
          const note = result.data
          this.updateIndexItem(note, false)
        }
      }
    }

    this.notifyIndexListeners()
  }

  public getIndex(): NoteIndexItem[] {
    return Array.from(this.index.values()).sort((a, b) => b.updatedAt - a.updatedAt)
  }

  public async getNote(id: string): Promise<Note | null> {
    // If there is an unflushed in-flight save, return that first
    const pending = this.pendingSaves.get(id)
    if (pending) {
      return { ...pending.note }
    }

    const notePath = this.getNotePath(id)
    const result = await readJsonWithBackup<Note>(notePath)
    if (!result || !result.data) {
      return null
    }

    return result.data
  }

  public queueSave(note: Note, options?: { touchUpdatedAt?: boolean }): void {
    // Recompute title and timestamps immediately for in-memory responsiveness
    const updatedNote = this.normalizeNote(note, options?.touchUpdatedAt ?? true)
    this.updateIndexItem(updatedNote, this.index.get(note.id)?.isOpen ?? false)
    this.notifyIndexListeners()

    const existing = this.pendingSaves.get(note.id)
    if (existing) {
      clearTimeout(existing.timer)
    }

    const timer = setTimeout(async () => {
      try {
        await this.writeToDisk(updatedNote)
      } catch (err) {
        console.error(`[NoteStore] Error saving debounced note ${note.id}:`, err)
      } finally {
        // Keep the note readable from memory until its write actually finishes.
        if (this.pendingSaves.get(note.id)?.timer === timer) {
          this.pendingSaves.delete(note.id)
        }
      }
    }, this.debounceMs)

    this.pendingSaves.set(note.id, { note: updatedNote, timer })
  }

  public async saveNoteNow(note: Note, options?: { touchUpdatedAt?: boolean }): Promise<void> {
    const existing = this.pendingSaves.get(note.id)
    if (existing) {
      clearTimeout(existing.timer)
      this.pendingSaves.delete(note.id)
    }

    const updatedNote = this.normalizeNote(note, options?.touchUpdatedAt ?? true)
    await this.writeToDisk(updatedNote)
    this.updateIndexItem(updatedNote, this.index.get(note.id)?.isOpen ?? false)
    this.notifyIndexListeners()
  }

  public async flush(): Promise<void> {
    // Drain again: saves can be queued while an earlier write is still awaited.
    while (this.pendingSaves.size > 0) {
      const saves = Array.from(this.pendingSaves.entries())
      this.pendingSaves.clear()

      for (const [, { note, timer }] of saves) {
        clearTimeout(timer)
        try {
          await this.writeToDisk(note)
        } catch (err) {
          console.error(`[NoteStore] Error flushing note ${note.id}:`, err)
        }
      }

      await Promise.allSettled(this.writeQueues.values())
    }

    await Promise.allSettled(this.writeQueues.values())
  }

  public async discardIfEmpty(note: Note, options?: { touchUpdatedAt?: boolean }): Promise<boolean> {
    // Cancel any pending write first
    const pending = this.pendingSaves.get(note.id)
    if (pending) {
      clearTimeout(pending.timer)
      this.pendingSaves.delete(note.id)
    }

    if (isNoteEmpty(note.plainText, note.content)) {
      await this.deleteNote(note.id)
      return true
    }

    // If not empty, save immediately
    await this.saveNoteNow(note, options)
    return false
  }

  public async deleteNote(id: string): Promise<boolean> {
    const pending = this.pendingSaves.get(id)
    if (pending) {
      clearTimeout(pending.timer)
      this.pendingSaves.delete(id)
    }

    this.index.delete(id)
    this.notifyIndexListeners()

    const inFlight = this.writeQueues.get(id)
    if (inFlight) {
      await inFlight.catch(() => {})
    }

    // Remove note file + bak
    const notePath = this.getNotePath(id)
    await removeFileAndBackup(notePath)

    // Remove assets directory if it exists
    const assetPath = this.getNoteAssetsDir(id)
    try {
      await fs.rm(assetPath, { recursive: true, force: true })
    } catch (err) {
      console.warn(`[NoteStore] Warning removing assets directory for ${id}:`, err)
    }

    return true
  }

  public setOpenStatus(id: string, isOpen: boolean): void {
    const item = this.index.get(id)
    if (item && item.isOpen !== isOpen) {
      item.isOpen = isOpen
      this.notifyIndexListeners()
    }
  }

  public onIndexChange(listener: (items: NoteIndexItem[]) => void): () => void {
    this.indexListeners.add(listener)
    return () => {
      this.indexListeners.delete(listener)
    }
  }

  private notifyIndexListeners(): void {
    const items = this.getIndex()
    for (const listener of this.indexListeners) {
      try {
        listener(items)
      } catch (err) {
        console.error('[NoteStore] Index change listener threw error:', err)
      }
    }
  }

  private normalizeNote(note: Note, touchUpdatedAt = true): Note {
    const title = deriveTitle(note.plainText)
    return {
      ...note,
      schemaVersion: 1,
      title,
      updatedAt: touchUpdatedAt ? Date.now() : note.updatedAt
    }
  }

  private updateIndexItem(note: Note, isOpen = false): void {
    const snippet = (note.plainText || '').slice(0, 200)
    this.index.set(note.id, {
      id: note.id,
      title: note.title,
      updatedAt: note.updatedAt,
      createdAt: note.createdAt,
      color: note.color,
      plainText: snippet,
      isOpen
    })
  }

  private async writeToDisk(note: Note): Promise<void> {
    const doWrite = async () => {
      const notePath = this.getNotePath(note.id)
      const data = JSON.stringify(note, null, 2)
      await writeAtomic(notePath, data)

      if (note.content) {
        const referenced = extractReferencedAssetFiles(note.content, note.id)
        cleanOrphanAssets(this.baseDir, note.id, referenced).catch((err) => {
          console.warn(`[NoteStore] Error cleaning orphan assets for ${note.id}:`, err)
        })
      }
    }

    const prev = this.writeQueues.get(note.id) ?? Promise.resolve()
    const run = prev.then(doWrite, doWrite)
    this.writeQueues.set(note.id, run)
    try {
      await run
    } finally {
      if (this.writeQueues.get(note.id) === run) {
        this.writeQueues.delete(note.id)
      }
    }
  }
}
