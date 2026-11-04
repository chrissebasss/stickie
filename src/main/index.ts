import { app, BrowserWindow, protocol, net } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { NoteStore } from './store/noteStore'
import { SettingsStore } from './store/settingsStore'
import { WindowManager } from './windows/windowManager'
import { createManagerWindow } from './windows/managerWindow'
import { registerIpcHandlers, applyTheme } from './ipc'
import { setupDisplayListeners } from './displays'
import { getAssetDiskPath } from './store/assets'

// Register custom protocol scheme as privileged before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'stikly-asset',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
])

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

const storageDir = join(app.getPath('userData'), 'Stikly')
const noteStore = new NoteStore(storageDir)
const settingsStore = new SettingsStore(storageDir)
const windowManager = new WindowManager(noteStore, settingsStore)

let isQuitting = false

app.whenReady().then(async () => {
  protocol.handle('stikly-asset', async (request) => {
    try {
      const url = new URL(request.url)
      const noteId = url.host
      const filename = url.pathname.replace(/^\//, '')
      const diskPath = getAssetDiskPath(noteStore.baseDir, noteId, filename)
      if (!diskPath) {
        return new Response('Not found', { status: 404 })
      }
      return net.fetch(pathToFileURL(diskPath).toString())
    } catch (err) {
      console.error('[Protocol] Error handling stikly-asset:', err)
      return new Response('Internal error', { status: 500 })
    }
  })

  await noteStore.init()
  const settings = await settingsStore.load()
  applyTheme(settings.theme)

  registerIpcHandlers(noteStore, settingsStore, windowManager)
  setupDisplayListeners(windowManager, noteStore)

  // Always open manager window on startup (AGENTS.md 4.8)
  const managerWin = createManagerWindow(settingsStore)
  windowManager.setManagerWindow(managerWin)

  // Optionally reopen notes that were open at last exit (default false)
  if (settings.reopenNotesOnLaunch && settings.openNoteIds.length > 0) {
    for (const noteId of settings.openNoteIds) {
      await windowManager.openNote(noteId)
    }
  }

  app.on('second-instance', () => {
    const mgr = windowManager.getManagerWindow()
    if (mgr) {
      if (mgr.isMinimized()) mgr.restore()
      mgr.show()
      mgr.focus()
    } else {
      const newMgr = createManagerWindow(settingsStore)
      windowManager.setManagerWindow(newMgr)
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const newMgr = createManagerWindow(settingsStore)
      windowManager.setManagerWindow(newMgr)
    }
  })
})

// Flush-on-exit handlers (AGENTS.md 4.5b)
const flushAndExit = async () => {
  if (isQuitting) return
  isQuitting = true
  try {
    await noteStore.flush()
  } catch (err) {
    console.error('[App] Error during exit flush:', err)
  }
}

app.on('before-quit', (e) => {
  if (!isQuitting) {
    e.preventDefault()
    flushAndExit().finally(() => {
      app.quit()
    })
  }
})

process.on('SIGTERM', async () => {
  await flushAndExit()
  process.exit(0)
})

process.on('SIGINT', async () => {
  await flushAndExit()
  process.exit(0)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
