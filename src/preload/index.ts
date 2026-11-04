import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { IPC_CHANNELS, type StickieAPI } from '../shared/ipc-contract'
import type {
  Note,
  NoteIndexItem,
  Settings,
  ThemeMode,
  ResolvedTheme,
  Bounds,
  NoteColor
} from '../shared/types'

const api: StickieAPI = {
  getNote: (noteId: string) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_GET, noteId),
  saveNote: (note: Note) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_SAVE, note),
  closeNote: (noteId: string, currentNote?: Note) =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTE_CLOSE, noteId, currentNote),
  createNote: (options) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_CREATE, options),
  deleteNote: (noteId: string) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_DELETE, noteId),
  setNotePin: (noteId: string, alwaysOnTop: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTE_SET_PIN, noteId, alwaysOnTop),
  updateNoteBounds: (noteId: string, bounds: Bounds) =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTE_UPDATE_BOUNDS, noteId, bounds),
  updateNoteColor: (noteId: string, color: NoteColor) =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTE_UPDATE_COLOR, noteId, color),

  listNotes: () => ipcRenderer.invoke(IPC_CHANNELS.NOTES_LIST),
  openNote: (noteId: string) => ipcRenderer.invoke(IPC_CHANNELS.NOTES_OPEN, noteId),
  closeAllNotes: () => ipcRenderer.invoke(IPC_CHANNELS.NOTES_CLOSE_ALL),

  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  updateSettings: (patch: Partial<Settings>) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, patch),
  getTheme: () => ipcRenderer.invoke(IPC_CHANNELS.THEME_GET),

  onThemeChanged: (callback: (theme: { mode: ThemeMode; resolved: ResolvedTheme }) => void) => {
    const handler = (_: IpcRendererEvent, theme: { mode: ThemeMode; resolved: ResolvedTheme }) => {
      callback(theme)
    }
    ipcRenderer.on(IPC_CHANNELS.EVENT_THEME_CHANGED, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_THEME_CHANGED, handler)
    }
  },

  onIndexUpdated: (callback: (items: NoteIndexItem[]) => void) => {
    const handler = (_: IpcRendererEvent, items: NoteIndexItem[]) => {
      callback(items)
    }
    ipcRenderer.on(IPC_CHANNELS.EVENT_INDEX_UPDATED, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_INDEX_UPDATED, handler)
    }
  },

  onNoteUpdated: (callback: (note: Note) => void) => {
    const handler = (_: IpcRendererEvent, note: Note) => {
      callback(note)
    }
    ipcRenderer.on(IPC_CHANNELS.EVENT_NOTE_UPDATED, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_NOTE_UPDATED, handler)
    }
  },

  pickImage: (noteId: string) => ipcRenderer.invoke(IPC_CHANNELS.ASSET_PICK_IMAGE, noteId),
  saveImageBuffer: (noteId: string, buffer: ArrayBuffer, ext: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.ASSET_SAVE_BUFFER, noteId, buffer, ext),

  importFiles: () => ipcRenderer.invoke(IPC_CHANNELS.IMPORT_FILES),
  exportNote: (noteId: string, format: 'json' | 'md') =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_NOTE, noteId, format)
}

contextBridge.exposeInMainWorld('stickie', api)

