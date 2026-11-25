import { BrowserWindow, app, screen } from 'electron'
import { join } from 'path'
import type { Note, Bounds } from '../../shared/types'
import type { NoteStore } from '../store/noteStore'
import type { SettingsStore } from '../store/settingsStore'
import { ensureVisible, getDisplayTopology, calculateSpawnBounds, type SpawnAnchor } from '../displays'
import { getAppIconPath } from '../icon'

export class WindowManager {
  private noteWindows: Map<string, BrowserWindow> = new Map()
  private managerWindow: BrowserWindow | null = null
  private noteStore: NoteStore
  private settingsStore: SettingsStore
  private lastCascadeOffset = 0
  private isQuitting = false

  public setQuitting(quitting: boolean): void {
    this.isQuitting = quitting
  }

  constructor(noteStore: NoteStore, settingsStore: SettingsStore) {
    this.noteStore = noteStore
    this.settingsStore = settingsStore
  }

  public setManagerWindow(win: BrowserWindow): void {
    this.managerWindow = win
    win.on('closed', () => {
      this.managerWindow = null
    })
  }

  public getManagerWindow(): BrowserWindow | null {
    return this.managerWindow
  }

  public getOpenNoteWindow(noteId: string): BrowserWindow | undefined {
    return this.noteWindows.get(noteId)
  }

  public getOpenNoteIds(): string[] {
    return Array.from(this.noteWindows.keys())
  }

  public async openNote(
    noteId: string,
    customBounds?: Bounds,
    options?: { skipSync?: boolean }
  ): Promise<BrowserWindow> {
    const existing = this.noteWindows.get(noteId)
    if (existing && !existing.isDestroyed()) {
      if (existing.isMinimized()) existing.restore()
      existing.focus()
      return existing
    }

    const note = await this.noteStore.getNote(noteId)
    const rawBounds = customBounds || note?.bounds || this.getNextCascadeBounds()
    const { workAreas, primary } = getDisplayTopology()
    const bounds = ensureVisible(rawBounds, workAreas, primary, this.lastCascadeOffset)

    const win = new BrowserWindow({
      icon: getAppIconPath(),
      x: bounds.x,
      y: bounds.y,
      width: Math.max(220, bounds.width),
      height: Math.max(180, bounds.height),
      minWidth: 220,
      minHeight: 180,
      frame: false,
      transparent: false,
      resizable: true,
      alwaysOnTop: note?.alwaysOnTop ?? false,
      show: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    this.noteWindows.set(noteId, win)
    this.noteStore.setOpenStatus(noteId, true)

    win.once('ready-to-show', () => {
      win.show()
      win.focus()
    })

    // Bounds saving on move and resize (debounced during drag, immediate on release)
    const saveBoundsNow = async () => {
      if (win.isDestroyed()) return
      const currentBounds = win.getNormalBounds()
      const currentNote = await this.noteStore.getNote(noteId)
      if (currentNote) {
        currentNote.bounds = currentBounds
        this.noteStore.queueSave(currentNote, { touchUpdatedAt: false })
      }
    }

    let boundsDebounce: NodeJS.Timeout | null = null
    const debouncedSaveBounds = () => {
      if (boundsDebounce) clearTimeout(boundsDebounce)
      boundsDebounce = setTimeout(saveBoundsNow, 150)
    }

    win.on('move', debouncedSaveBounds)
    win.on('moved', saveBoundsNow)
    win.on('resize', debouncedSaveBounds)
    win.on('resized', saveBoundsNow)

    win.on('close', async () => {
      if (boundsDebounce) {
        clearTimeout(boundsDebounce)
        boundsDebounce = null
      }
      if (!win.isDestroyed()) {
        try {
          const currentBounds = win.getNormalBounds()
          const currentNote = await this.noteStore.getNote(noteId)
          if (currentNote) {
            currentNote.bounds = currentBounds
            await this.noteStore.saveNoteNow(currentNote, { touchUpdatedAt: false })
          }
        } catch {
          // ignore
        }
      }
      await this.noteStore.flush()
    })

    win.on('closed', async () => {
      if (boundsDebounce) clearTimeout(boundsDebounce)
      this.noteWindows.delete(noteId)
      this.noteStore.setOpenStatus(noteId, false)
      if (!this.isQuitting) {
        this.syncOpenNoteIdsToSettings()
      }
    })

    const devUrl = process.env.ELECTRON_RENDERER_URL
      ? `${process.env.ELECTRON_RENDERER_URL}/note/index.html?id=${encodeURIComponent(noteId)}`
      : null
    const distPath = join(__dirname, '../renderer/note/index.html')

    if (devUrl) {
      try {
        await win.loadURL(devUrl)
      } catch (err) {
        console.warn(`[WindowManager] Could not load dev server URL ${devUrl}, falling back to built bundle:`, err)
        try {
          if (!win.isDestroyed()) {
            await win.loadFile(distPath, { query: { id: noteId } })
          }
        } catch (fileErr) {
          console.error(`[WindowManager] Fallback loadFile also failed:`, fileErr)
        }
      }
    } else {
      if (!win.isDestroyed()) {
        await win.loadFile(distPath, { query: { id: noteId } })
      }
    }

    if (!options?.skipSync) {
      this.syncOpenNoteIdsToSettings()
    }
    return win
  }

  public async closeNote(noteId: string): Promise<void> {
    const win = this.noteWindows.get(noteId)
    if (win && !win.isDestroyed()) {
      try {
        const currentBounds = win.getNormalBounds()
        const currentNote = await this.noteStore.getNote(noteId)
        if (currentNote) {
          currentNote.bounds = currentBounds
          await this.noteStore.saveNoteNow(currentNote, { touchUpdatedAt: false })
        }
      } catch {
        // ignore
      }
      win.close()
    }
  }

  public async closeAllNotes(): Promise<void> {
    for (const [noteId, win] of this.noteWindows) {
      if (!win.isDestroyed()) {
        try {
          const currentBounds = win.getNormalBounds()
          const currentNote = await this.noteStore.getNote(noteId)
          if (currentNote) {
            currentNote.bounds = currentBounds
            await this.noteStore.saveNoteNow(currentNote, { touchUpdatedAt: false })
          }
        } catch {
          // ignore
        }
        win.close()
      }
    }
    await this.noteStore.flush()
  }

  public setNoteAlwaysOnTop(noteId: string, alwaysOnTop: boolean): void {
    const win = this.noteWindows.get(noteId)
    if (win && !win.isDestroyed()) {
      win.setAlwaysOnTop(alwaysOnTop)
    }
  }

  public calculateNewNoteBounds(sourceWin?: BrowserWindow | null): Bounds {
    const baseWidth = 320
    const baseHeight = 360
    const gap = 12

    let anchor: SpawnAnchor | null = null
    let targetDisplay: Electron.Display | null = null

    if (sourceWin && !sourceWin.isDestroyed()) {
      const bounds = sourceWin.getNormalBounds()
      targetDisplay = screen.getDisplayMatching(bounds)
      if (sourceWin === this.managerWindow) {
        anchor = { type: 'manager', bounds }
      } else {
        anchor = { type: 'note', bounds }
      }
    } else if (this.managerWindow && !this.managerWindow.isDestroyed() && this.managerWindow.isVisible()) {
      const bounds = this.managerWindow.getNormalBounds()
      targetDisplay = screen.getDisplayMatching(bounds)
      anchor = { type: 'manager', bounds }
    }

    if (!targetDisplay) {
      const cursorPoint = screen.getCursorScreenPoint()
      targetDisplay = screen.getDisplayNearestPoint(cursorPoint) || screen.getPrimaryDisplay()
    }

    const workArea = targetDisplay.workArea
    const openNotes = Array.from(this.noteWindows.values())
      .filter((w) => !w.isDestroyed() && w !== sourceWin)
      .map((w) => w.getNormalBounds())

    return calculateSpawnBounds(
      anchor,
      workArea,
      openNotes,
      { width: baseWidth, height: baseHeight },
      gap
    )
  }

  public getNextCascadeBounds(): Bounds {
    return this.calculateNewNoteBounds(null)
  }

  public syncOpenNoteIdsToSettings(): void {
    const openIds = this.getOpenNoteIds()
    this.settingsStore.update({ openNoteIds: openIds }).catch((err) => {
      console.warn('[WindowManager] Error updating openNoteIds in settings:', err)
    })
  }
}
