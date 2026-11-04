import { Tray, Menu, nativeImage, app } from 'electron'
import { join } from 'path'

export interface TrayCallbacks {
  onNewNote: () => void
  onShowManager: () => void
  onCloseAllNotes: () => void
  onQuit: () => void
}

let trayInstance: Tray | null = null

export function setupTray(callbacks: TrayCallbacks): Tray | null {
  try {
    const iconPath = join(__dirname, '../../resources/icons/tray-24.png')
    const icon = nativeImage.createFromPath(iconPath)

    trayInstance = new Tray(icon)
    trayInstance.setToolTip('Stikly')

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'New note',
        click: () => callbacks.onNewNote()
      },
      {
        label: 'My notes',
        click: () => callbacks.onShowManager()
      },
      {
        label: 'Close all notes',
        click: () => callbacks.onCloseAllNotes()
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => callbacks.onQuit()
      }
    ])

    trayInstance.setContextMenu(contextMenu)

    // Left click on Windows: show or focus manager window
    trayInstance.on('click', () => {
      callbacks.onShowManager()
    })

    return trayInstance
  } catch (err) {
    console.warn(
      '[Tray] Tray creation failed or environment lacks StatusNotifier/AppIndicator support. Falling back gracefully.',
      err
    )
    return null
  }
}

export function getTray(): Tray | null {
  return trayInstance
}

export function destroyTray(): void {
  if (trayInstance) {
    trayInstance.destroy()
    trayInstance = null
  }
}
