import { BrowserWindow } from 'electron'
import { join } from 'path'
import type { SettingsStore } from '../store/settingsStore'
import { getAppIconPath } from '../icon'
import { ensureVisible, getDisplayTopology } from '../displays'

export function createManagerWindow(
  settingsStore: SettingsStore,
  onCloseRequest?: () => void,
  isQuitting?: () => boolean
): BrowserWindow {
  const cachedSettings = settingsStore.getCached()
  const rawBounds = cachedSettings.managerBounds
  const savedBounds = rawBounds
    ? (() => {
        const { workAreas, primary } = getDisplayTopology()
        return ensureVisible(rawBounds, workAreas, primary)
      })()
    : undefined

  const win = new BrowserWindow({
    icon: getAppIconPath(),
    x: savedBounds?.x,
    y: savedBounds?.y,
    width: savedBounds?.width || 400,
    height: savedBounds?.height || 500,
    minWidth: 400,
    minHeight: 400,
    title: 'Stickie - My Notes',
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
    if (isQuitting?.()) {
      return
    }
    if (onCloseRequest) {
      e.preventDefault()
      onCloseRequest()
    }
  })

  win.once('ready-to-show', () => {
    win.show()
  })

  const distPath = join(__dirname, '../renderer/manager/index.html')
  if (process.env.ELECTRON_RENDERER_URL) {
    const devUrl = `${process.env.ELECTRON_RENDERER_URL}/manager/index.html`
    win.loadURL(devUrl).catch((err) => {
      console.warn(`[ManagerWindow] Could not load dev server URL ${devUrl}, falling back to built bundle:`, err)
      if (!win.isDestroyed()) {
        win.loadFile(distPath).catch(console.error)
      }
    })
  } else {
    if (!win.isDestroyed()) {
      win.loadFile(distPath).catch(console.error)
    }
  }

  return win
}

