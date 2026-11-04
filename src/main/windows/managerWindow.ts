import { BrowserWindow } from 'electron'
import { join } from 'path'
import type { SettingsStore } from '../store/settingsStore'

export function createManagerWindow(
  settingsStore: SettingsStore,
  onCloseRequest?: () => void
): BrowserWindow {
  const cachedSettings = settingsStore.getCached()
  const savedBounds = cachedSettings.managerBounds

  const win = new BrowserWindow({
    x: savedBounds?.x,
    y: savedBounds?.y,
    width: savedBounds?.width || 840,
    height: savedBounds?.height || 620,
    minWidth: 500,
    minHeight: 400,
    title: 'Stikly - My Notes',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Debounced bounds save
  let boundsDebounce: NodeJS.Timeout | null = null
  const saveBounds = () => {
    if (boundsDebounce) clearTimeout(boundsDebounce)
    boundsDebounce = setTimeout(() => {
      if (!win.isDestroyed()) {
        const bounds = win.getNormalBounds()
        settingsStore.update({ managerBounds: bounds }).catch(console.error)
      }
    }, 400)
  }

  win.on('move', saveBounds)
  win.on('resize', saveBounds)

  win.on('close', (e) => {
    if (onCloseRequest) {
      e.preventDefault()
      onCloseRequest()
    }
  })

  win.once('ready-to-show', () => {
    win.show()
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/manager/index.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/manager/index.html'))
  }

  return win
}
