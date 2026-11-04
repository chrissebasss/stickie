import { BrowserWindow, app, screen } from 'electron'
import { join } from 'path'
import type { Note, Bounds } from '../../shared/types'
import type { NoteStore } from '../store/noteStore'
import type { SettingsStore } from '../store/settingsStore'
import { ensureVisible, getDisplayTopology } from '../displays'

export class WindowManager {
  private noteWindows: Map<string, BrowserWindow> = new Map()
  private managerWindow: BrowserWindow | null = null
  private noteStore: NoteStore
  private settingsStore: SettingsStore
  private lastCascadeOffset = 0

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

  public async openNote(noteId: string, customBounds?: Bounds): Promise<BrowserWindow> {
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
    })

    // Debounced bounds saving on move and resize
    let boundsDebounce: NodeJS.Timeout | null = null
    const saveBounds = () => {
      if (boundsDebounce) clearTimeout(boundsDebounce)
      boundsDebounce = setTimeout(async () => {
        if (!win.isDestroyed()) {
          const currentBounds = win.getNormalBounds()
          const currentNote = await this.noteStore.getNote(noteId)
          if (currentNote) {
            currentNote.bounds = currentBounds
            this.noteStore.queueSave(currentNote)
          }
        }
      }, 400)
    }

    win.on('move', saveBounds)
    win.on('resize', saveBounds)

    win.on('close', async () => {
      if (boundsDebounce) clearTimeout(boundsDebounce)
      await this.noteStore.flush()
    })

    win.on('closed', async () => {
      if (boundsDebounce) clearTimeout(boundsDebounce)
      this.noteWindows.delete(noteId)
      this.noteStore.setOpenStatus(noteId, false)
      this.syncOpenNoteIdsToSettings()
    })

    const noteUrl = process.env.ELECTRON_RENDERER_URL
      ? `${process.env.ELECTRON_RENDERER_URL}/note/index.html?id=${encodeURIComponent(noteId)}`
      : join(__dirname, '../renderer/note/index.html')

    if (process.env.ELECTRON_RENDERER_URL) {
      await win.loadURL(noteUrl)
    } else {
      await win.loadFile(noteUrl, { query: { id: noteId } })
    }

    this.syncOpenNoteIdsToSettings()
    return win
  }

  public async closeNote(noteId: string): Promise<void> {
    const win = this.noteWindows.get(noteId)
    if (win && !win.isDestroyed()) {
      win.close()
    }
  }

  public closeAllNotes(): void {
    for (const [, win] of this.noteWindows) {
      if (!win.isDestroyed()) {
        win.close()
      }
    }
  }

  public setNoteAlwaysOnTop(noteId: string, alwaysOnTop: boolean): void {
    const win = this.noteWindows.get(noteId)
    if (win && !win.isDestroyed()) {
      win.setAlwaysOnTop(alwaysOnTop)
    }
  }

  public getNextCascadeBounds(): Bounds {
    const baseWidth = 320
    const baseHeight = 360

    // Detect where the user currently is:
    // Priority 1: If manager window is focused/visible, place note on the manager window's display
    // Priority 2: Display nearest the cursor position
    let workArea = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea

    const managerWin = this.managerWindow
    if (managerWin && !managerWin.isDestroyed() && managerWin.isVisible()) {
      if (managerWin.isFocused()) {
        const display = screen.getDisplayMatching(managerWin.getBounds())
        workArea = display.workArea
      }
    }

    const offset = (this.lastCascadeOffset % 8) * 30
    this.lastCascadeOffset++

    return {
      x: workArea.x + 80 + offset,
      y: workArea.y + 80 + offset,
      width: baseWidth,
      height: baseHeight
    }
  }

  private syncOpenNoteIdsToSettings(): void {
    const openIds = this.getOpenNoteIds()
    this.settingsStore.update({ openNoteIds: openIds }).catch((err) => {
      console.warn('[WindowManager] Error updating openNoteIds in settings:', err)
    })
  }
}
