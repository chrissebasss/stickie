import { ipcMain, nativeTheme, BrowserWindow, dialog, net } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { IPC_CHANNELS } from '../shared/ipc-contract'
import type {
  Note,
  NoteColor,
  Bounds,
  Settings,
  ThemeMode,
  ResolvedTheme
} from '../shared/types'
import type { NoteStore } from './store/noteStore'
import type { SettingsStore } from './store/settingsStore'
import type { WindowManager } from './windows/windowManager'
import { saveAssetFile, saveAssetBuffer } from './store/assets'
import { importFilesFromDisk, exportNoteToFile } from './importExport'
import { applyLoginItem } from './loginItem'

export function registerIpcHandlers(
  noteStore: NoteStore,
  settingsStore: SettingsStore,
  windowManager: WindowManager
): void {
  // 1. Note: Get
  ipcMain.handle(IPC_CHANNELS.NOTE_GET, async (_, noteId: string): Promise<Note | null> => {
    if (!noteId) return null
    return noteStore.getNote(noteId)
  })

  // 2. Note: Save
  ipcMain.handle(IPC_CHANNELS.NOTE_SAVE, async (_, note: Note): Promise<void> => {
    if (!note || !note.id) return
    const win = windowManager.getOpenNoteWindow(note.id)
    if (win && !win.isDestroyed()) {
      note.bounds = win.getNormalBounds()
    } else {
      const existing = await noteStore.getNote(note.id)
      if (existing) {
        note.bounds = existing.bounds
      }
    }
    noteStore.queueSave(note)
  })

  // 3. Note: Close
  ipcMain.handle(
    IPC_CHANNELS.NOTE_CLOSE,
    async (_, noteId: string, currentNote?: Note): Promise<void> => {
      if (!noteId) return
      const win = windowManager.getOpenNoteWindow(noteId)
      let noteToSave = currentNote || (await noteStore.getNote(noteId))
      if (noteToSave) {
        if (win && !win.isDestroyed()) {
          noteToSave.bounds = win.getNormalBounds()
        } else {
          const existing = await noteStore.getNote(noteId)
          if (existing) {
            noteToSave.bounds = existing.bounds
          }
        }
        await noteStore.discardIfEmpty(noteToSave)
      }
      await windowManager.closeNote(noteId)
    }
  )

  // 4. Note: Create
  ipcMain.handle(
    IPC_CHANNELS.NOTE_CREATE,
    async (
      event,
      options?: { plainText?: string; color?: NoteColor }
    ): Promise<Note> => {
      const now = Date.now()
      const senderWin = BrowserWindow.fromWebContents(event.sender)
      const newBounds = windowManager.calculateNewNoteBounds(senderWin)
      const newNote: Note = {
        schemaVersion: 1,
        id: uuidv4(),
        title: 'Untitled note',
        createdAt: now,
        updatedAt: now,
        color: options?.color || { kind: 'preset', id: 'yellow' },
        bounds: newBounds,
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: options?.plainText
                ? [{ type: 'text', text: options.plainText }]
                : []
            }
          ]
        },
        plainText: options?.plainText || '',
        alwaysOnTop: false
      }

      await noteStore.saveNoteNow(newNote)
      await windowManager.openNote(newNote.id, newBounds)
      return newNote
    }
  )

  // 5. Note: Delete
  ipcMain.handle(IPC_CHANNELS.NOTE_DELETE, async (_, noteId: string): Promise<boolean> => {
    if (!noteId) return false
    await windowManager.closeNote(noteId)
    return noteStore.deleteNote(noteId)
  })

  // 6. Note: Set Pin
  ipcMain.handle(
    IPC_CHANNELS.NOTE_SET_PIN,
    async (_, noteId: string, alwaysOnTop: boolean): Promise<void> => {
      if (!noteId) return
      windowManager.setNoteAlwaysOnTop(noteId, alwaysOnTop)
      const note = await noteStore.getNote(noteId)
      if (note) {
        note.alwaysOnTop = alwaysOnTop
        noteStore.queueSave(note)
      }
    }
  )

  // 7. Note: Update Bounds
  ipcMain.handle(
    IPC_CHANNELS.NOTE_UPDATE_BOUNDS,
    async (_, noteId: string, bounds: Bounds): Promise<void> => {
      if (!noteId || !bounds) return
      const note = await noteStore.getNote(noteId)
      if (note) {
        note.bounds = bounds
        noteStore.queueSave(note)
      }
    }
  )

  // 8. Note: Update Color
  ipcMain.handle(
    IPC_CHANNELS.NOTE_UPDATE_COLOR,
    async (_, noteId: string, color: NoteColor): Promise<void> => {
      if (!noteId || !color) return
      const note = await noteStore.getNote(noteId)
      if (note) {
        note.color = color
        noteStore.queueSave(note)
      }
    }
  )

  // 9. Notes: List
  ipcMain.handle(IPC_CHANNELS.NOTES_LIST, async () => {
    return noteStore.getIndex()
  })

  // 10. Notes: Open
  ipcMain.handle(IPC_CHANNELS.NOTES_OPEN, async (_, noteId: string): Promise<void> => {
    if (!noteId) return
    await windowManager.openNote(noteId)
  })

  // 11. Notes: Close All
  ipcMain.handle(IPC_CHANNELS.NOTES_CLOSE_ALL, async (): Promise<void> => {
    await noteStore.flush()
    windowManager.closeAllNotes()
  })

  // 12. Settings: Get & Update
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async (): Promise<Settings> => {
    return settingsStore.load()
  })

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_UPDATE,
    async (_, patch: Partial<Settings>): Promise<Settings> => {
      const updated = await settingsStore.update(patch)
      if (patch.theme) {
        applyTheme(patch.theme)
      }
      if (patch.launchAtLogin !== undefined) {
        applyLoginItem(patch.launchAtLogin)
      }
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.EVENT_SETTINGS_CHANGED, updated)
        }
      }
      return updated
    }
  )

  // 13. Theme: Get
  ipcMain.handle(
    IPC_CHANNELS.THEME_GET,
    async (): Promise<{ mode: ThemeMode; resolved: ResolvedTheme }> => {
      const settings = await settingsStore.load()
      return {
        mode: settings.theme,
        resolved: nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
      }
    }
  )

  // 14. Asset: Pick Image
  ipcMain.handle(
    IPC_CHANNELS.ASSET_PICK_IMAGE,
    async (_, noteId: string): Promise<string | null> => {
      if (!noteId) return null
      const result = await dialog.showOpenDialog({
        title: 'Select Image',
        properties: ['openFile'],
        filters: [
          { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }
        ]
      })

      if (result.canceled || result.filePaths.length === 0) {
        return null
      }

      const sourcePath = result.filePaths[0]
      return saveAssetFile(noteStore.baseDir, noteId, sourcePath)
    }
  )

  // 15. Asset: Save Buffer
  ipcMain.handle(
    IPC_CHANNELS.ASSET_SAVE_BUFFER,
    async (
      _,
      noteId: string,
      buffer: ArrayBuffer,
      ext: string
    ): Promise<string | null> => {
      if (!noteId || !buffer) return null
      const nodeBuf = Buffer.from(buffer)
      return saveAssetBuffer(noteStore.baseDir, noteId, nodeBuf, ext)
    }
  )

  // 16. Import files
  ipcMain.handle(IPC_CHANNELS.IMPORT_FILES, async () => {
    return importFilesFromDisk(noteStore)
  })

  // 17. Export note
  ipcMain.handle(
    IPC_CHANNELS.EXPORT_NOTE,
    async (_, noteId: string, format: 'json' | 'md'): Promise<boolean> => {
      if (!noteId) return false
      return exportNoteToFile(noteStore, noteId, format)
    }
  )

  // Sync index changes across all open windows
  noteStore.onIndexChange((items) => {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.EVENT_INDEX_UPDATED, items)
      }
    }
  })

  // Listen for native theme changes and broadcast to all windows
  nativeTheme.on('updated', () => {
    const resolved: ResolvedTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
    const settings = settingsStore.getCached()
    const payload = { mode: settings.theme, resolved }
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.EVENT_THEME_CHANGED, payload)
      }
    }
  })
}

export function applyTheme(theme: ThemeMode): void {
  if (theme === 'system') {
    nativeTheme.themeSource = 'system'
  } else if (theme === 'dark') {
    nativeTheme.themeSource = 'dark'
  } else {
    nativeTheme.themeSource = 'light'
  }
}
