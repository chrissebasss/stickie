import type {
  Note,
  NoteIndexItem,
  Settings,
  ThemeMode,
  ResolvedTheme,
  Bounds,
  NoteColor
} from './types'

export const IPC_CHANNELS = {
  // Notes
  NOTE_GET: 'note:get',
  NOTE_SAVE: 'note:save',
  NOTE_CLOSE: 'note:close',
  NOTE_CREATE: 'note:create',
  NOTE_DELETE: 'note:delete',
  NOTE_SET_PIN: 'note:set-pin',
  NOTE_UPDATE_BOUNDS: 'note:update-bounds',
  NOTE_UPDATE_COLOR: 'note:update-color',

  // Manager
  NOTES_LIST: 'notes:list',
  NOTES_OPEN: 'notes:open',
  NOTES_CLOSE_ALL: 'notes:close-all',
  NOTES_RESTORE: 'notes:restore',

  // Settings & Theme
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  THEME_GET: 'theme:get',

  // Assets & Dialogs
  ASSET_PICK_IMAGE: 'asset:pick-image',
  ASSET_SAVE_BUFFER: 'asset:save-buffer',

  // Import / Export
  IMPORT_FILES: 'import:files',
  EXPORT_NOTE: 'export:note',

  // Push events (Main -> Renderer)
  EVENT_INDEX_UPDATED: 'event:index-updated',
  EVENT_THEME_CHANGED: 'event:theme-changed',
  EVENT_NOTE_UPDATED: 'event:note-updated'
} as const

export interface StiklyAPI {
  // Note specific
  getNote: (noteId: string) => Promise<Note | null>
  saveNote: (note: Note) => Promise<void>
  closeNote: (noteId: string) => Promise<void>
  createNote: (options?: { plainText?: string; color?: NoteColor }) => Promise<Note>
  deleteNote: (noteId: string) => Promise<boolean>
  setNotePin: (noteId: string, alwaysOnTop: boolean) => Promise<void>
  updateNoteBounds: (noteId: string, bounds: Bounds) => Promise<void>
  updateNoteColor: (noteId: string, color: NoteColor) => Promise<void>

  // Manager
  listNotes: () => Promise<NoteIndexItem[]>
  openNote: (noteId: string) => Promise<void>
  closeAllNotes: () => Promise<void>

  // Settings & Theme
  getSettings: () => Promise<Settings>
  updateSettings: (patch: Partial<Settings>) => Promise<Settings>
  getTheme: () => Promise<{ mode: ThemeMode; resolved: ResolvedTheme }>
  onThemeChanged: (callback: (theme: { mode: ThemeMode; resolved: ResolvedTheme }) => void) => () => void
  onIndexUpdated: (callback: (items: NoteIndexItem[]) => void) => () => void
  onNoteUpdated: (callback: (note: Note) => void) => () => void

  // Assets
  pickImage: (noteId: string) => Promise<string | null>
  saveImageBuffer: (noteId: string, buffer: ArrayBuffer, ext: string) => Promise<string | null>

  // Import & Export
  importFiles: () => Promise<string[]>
  exportNote: (noteId: string, format: 'json' | 'md') => Promise<boolean>
}

