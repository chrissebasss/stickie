import type { JSONContent } from '@tiptap/vue-3'
export type { JSONContent }

export type PresetColorId = 'yellow' | 'green' | 'blue' | 'pink'

export type NoteColor =
  | { kind: 'preset'; id: PresetColorId }
  | { kind: 'custom'; hex: string }

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export type NoteBounds = Bounds

export interface Note {
  schemaVersion: 1
  id: string
  title: string
  createdAt: number
  updatedAt: number
  color: NoteColor
  bounds: Bounds
  content: JSONContent
  plainText: string
  alwaysOnTop?: boolean
}

export interface NoteIndexItem {
  id: string
  title: string
  updatedAt: number
  createdAt: number
  color: NoteColor
  plainText: string
  isOpen: boolean
}

export type ThemeMode = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'
export type LanguageMode = 'system' | 'en' | 'nb'

export interface Settings {
  schemaVersion: 1
  theme: ThemeMode
  language?: LanguageMode
  reopenNotesOnLaunch: boolean
  openNoteIds: string[]
  managerBounds?: Bounds
  alwaysOnTop: boolean
  launchAtLogin: boolean
}

export interface ColorScheme {
  bg: string
  fg: string
  barBg: string
  barFg: string
}
