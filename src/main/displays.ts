import { screen, powerMonitor } from 'electron'
import type { WindowManager } from './windows/windowManager'
import type { NoteStore } from './store/noteStore'
import { ensureVisible, type Rect } from '../shared/displays'

export { ensureVisible, type Rect } from '../shared/displays'

/**
 * Electron glue: gathers work areas from electron.screen in DIPs.
 */
export function getDisplayTopology(): { workAreas: Rect[]; primary: Rect } {
  const displays = screen.getAllDisplays()
  const primaryDisplay = screen.getPrimaryDisplay()

  const workAreas = displays.map((d) => ({
    x: d.workArea.x,
    y: d.workArea.y,
    width: d.workArea.width,
    height: d.workArea.height
  }))

  const primary: Rect = {
    x: primaryDisplay.workArea.x,
    y: primaryDisplay.workArea.y,
    width: primaryDisplay.workArea.width,
    height: primaryDisplay.workArea.height
  }

  return { workAreas, primary }
}

/**
 * Validates and relocates all open windows and updates noteStore persistence.
 */
export async function validateAndRelocateAllWindows(
  windowManager: WindowManager,
  noteStore: NoteStore
): Promise<void> {
  const { workAreas, primary } = getDisplayTopology()
  const openIds = windowManager.getOpenNoteIds()

  let cascadeIndex = 0
  for (const noteId of openIds) {
    const win = windowManager.getOpenNoteWindow(noteId)
    if (win && !win.isDestroyed()) {
      const currentBounds = win.getNormalBounds()
      const safeBounds = ensureVisible(currentBounds, workAreas, primary, cascadeIndex)

      if (
        safeBounds.x !== currentBounds.x ||
        safeBounds.y !== currentBounds.y ||
        safeBounds.width !== currentBounds.width ||
        safeBounds.height !== currentBounds.height
      ) {
        win.setBounds(safeBounds)
        const note = await noteStore.getNote(noteId)
        if (note) {
          note.bounds = safeBounds
          noteStore.queueSave(note)
        }
        cascadeIndex++
      }
    }
  }

  // Also validate manager window
  const managerWin = windowManager.getManagerWindow()
  if (managerWin && !managerWin.isDestroyed()) {
    const currentBounds = managerWin.getNormalBounds()
    const safeBounds = ensureVisible(currentBounds, workAreas, primary, 0)
    if (
      safeBounds.x !== currentBounds.x ||
      safeBounds.y !== currentBounds.y ||
      safeBounds.width !== currentBounds.width ||
      safeBounds.height !== currentBounds.height
    ) {
      managerWin.setBounds(safeBounds)
    }
  }
}

/**
 * Registers screen and powerMonitor listeners.
 */
export function setupDisplayListeners(
  windowManager: WindowManager,
  noteStore: NoteStore
): void {
  const handler = () => {
    validateAndRelocateAllWindows(windowManager, noteStore).catch(console.error)
  }

  screen.on('display-removed', handler)
  screen.on('display-added', handler)
  screen.on('display-metrics-changed', handler)
  powerMonitor.on('resume', handler)
}
