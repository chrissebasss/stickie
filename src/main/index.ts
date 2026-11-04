import { app, BrowserWindow, protocol, net, Menu, MenuItem } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { v4 as uuidv4 } from 'uuid'
import { NoteStore } from './store/noteStore'
import { SettingsStore } from './store/settingsStore'
import { WindowManager } from './windows/windowManager'
import { createManagerWindow } from './windows/managerWindow'
import { registerIpcHandlers, applyTheme } from './ipc'
import { setupDisplayListeners } from './displays'
import { getAssetDiskPath } from './store/assets'
import { setupTray, getTray, destroyTray } from './tray'

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

  // Register application edit menu so standard keyboard shortcuts (Ctrl+C, Ctrl+V, etc.)
  // work natively across all windows, including frameless sticky notes.
  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate))

  // Context menu for right-click Cut, Copy, Paste
  app.on('web-contents-created', (_, contents) => {
    contents.on('context-menu', (_, params) => {
      const contextMenu = new Menu()
      if (params.isEditable) {
        contextMenu.append(new MenuItem({ role: 'undo' }))
        contextMenu.append(new MenuItem({ role: 'redo' }))
        contextMenu.append(new MenuItem({ type: 'separator' }))
        contextMenu.append(new MenuItem({ role: 'cut' }))
        contextMenu.append(new MenuItem({ role: 'copy' }))
        contextMenu.append(new MenuItem({ role: 'paste' }))
        contextMenu.append(new MenuItem({ role: 'selectAll' }))
        contextMenu.popup()
      } else if (params.selectionText && params.selectionText.trim().length > 0) {
        contextMenu.append(new MenuItem({ role: 'copy' }))
        contextMenu.popup()
      }
    })
  })

  registerIpcHandlers(noteStore, settingsStore, windowManager)
  setupDisplayListeners(windowManager, noteStore)

  const isQuittingFn = () => isQuitting

  const onManagerClose = () => {
    if (isQuitting) return
    const mgr = windowManager.getManagerWindow()
    if (!mgr) return
    if (getTray()) {
      mgr.hide()
    } else {
      if (windowManager.getOpenNoteIds().length === 0) {
        isQuitting = true
        app.quit()
      } else {
        mgr.hide()
      }
    }
  }

  const showManager = () => {
    let mgr = windowManager.getManagerWindow()
    if (!mgr || mgr.isDestroyed()) {
      mgr = createManagerWindow(settingsStore, onManagerClose, isQuittingFn)
      windowManager.setManagerWindow(mgr)
    }
    if (mgr.isMinimized()) mgr.restore()
    mgr.show()
    mgr.focus()
  }

  // Always open manager window on startup (AGENTS.md 4.8)
  const managerWin = createManagerWindow(settingsStore, onManagerClose, isQuittingFn)
  windowManager.setManagerWindow(managerWin)

  setupTray({
    onNewNote: async () => {
      const id = uuidv4()
      const newNote = {
        schemaVersion: 1 as const,
        id,
        title: 'Untitled note',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        color: { kind: 'preset' as const, id: 'yellow' as const },
        bounds: windowManager.getNextCascadeBounds(),
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
        plainText: '',
        alwaysOnTop: false
      }
      await noteStore.saveNoteNow(newNote)
      await windowManager.openNote(newNote.id)
    },
    onShowManager: showManager,
    onCloseAllNotes: async () => {
      await noteStore.flush()
      windowManager.closeAllNotes()
    },
    onQuit: async () => {
      isQuitting = true
      destroyTray()
      await flushAndExit()
      app.exit(0)
    }
  })

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
      const newMgr = createManagerWindow(settingsStore, onManagerClose, isQuittingFn)
      windowManager.setManagerWindow(newMgr)
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const newMgr = createManagerWindow(settingsStore, onManagerClose, isQuittingFn)
      windowManager.setManagerWindow(newMgr)
    }
  })
})

// Flush-on-exit handlers (AGENTS.md 4.5b)
let hasFlushed = false
const flushAndExit = async () => {
  if (hasFlushed) return
  hasFlushed = true
  try {
    await noteStore.flush()
  } catch (err) {
    console.error('[App] Error during exit flush:', err)
  }
}

app.on('before-quit', (e) => {
  if (!isQuitting) {
    isQuitting = true
    e.preventDefault()
    destroyTray()
    flushAndExit().finally(() => {
      app.exit(0)
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
