import { app, BrowserWindow } from 'electron'
import { join } from 'path'

// Linux Wayland handling: default to x11 for reliable multi-window positioning unless overridden
if (process.platform === 'linux') {
  const ozonePlatform = process.env.STIKLY_OZONE || 'x11'
  app.commandLine.appendSwitch('ozone-platform-hint', ozonePlatform)
}

// Single-instance lock
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

let managerWindow: BrowserWindow | null = null

function createManagerWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 480,
    minHeight: 360,
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

  win.on('ready-to-show', () => {
    win.show()
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/manager/index.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/manager/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  managerWindow = createManagerWindow()

  app.on('second-instance', () => {
    if (managerWindow) {
      if (managerWindow.isMinimized()) managerWindow.restore()
      managerWindow.focus()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      managerWindow = createManagerWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
