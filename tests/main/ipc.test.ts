import { describe, it, expect, vi, beforeEach } from 'vitest'

const { handlers, calls, updaterMock } = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => Promise<unknown>>(),
  calls: [] as string[],
  updaterMock: {
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    installUpdate: vi.fn()
  }
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: unknown[]) => Promise<unknown>) => {
      handlers.set(channel, handler)
    }
  },
  BrowserWindow: { getAllWindows: () => [] },
  nativeTheme: { on: () => {}, shouldUseDarkColors: false },
  dialog: {},
  shell: {}
}))
vi.mock('@main/updater', () => updaterMock)

import { registerIpcHandlers } from '@main/ipc'
import { IPC_CHANNELS } from '@shared/ipc-contract'
import type { NoteStore } from '@main/store/noteStore'
import type { SettingsStore } from '@main/store/settingsStore'
import type { WindowManager } from '@main/windows/windowManager'

const noteStore = { onIndexChange: () => {} } as unknown as NoteStore
const settingsStore = {} as SettingsStore
const windowManager = {} as WindowManager

function register(flushAndExit: () => Promise<void>, setInstallingUpdate: (value: boolean) => void) {
  registerIpcHandlers(noteStore, settingsStore, windowManager, { flushAndExit, setInstallingUpdate })
  return handlers.get(IPC_CHANNELS.APP_INSTALL_UPDATE)!
}

describe('install update IPC handler', () => {
  beforeEach(() => {
    handlers.clear()
    calls.length = 0
    updaterMock.installUpdate.mockReset()
  })

  it('arms the quit bypass only after the store flush completes', async () => {
    let releaseFlush!: () => void
    const gate = new Promise<void>((resolve) => {
      releaseFlush = resolve
    })
    const flushAndExit = async () => {
      calls.push('flush:start')
      await gate
      calls.push('flush:end')
    }
    const install = register(flushAndExit, (value) => calls.push(`flag:${value}`))
    updaterMock.installUpdate.mockImplementationOnce(() => calls.push('install'))

    const pending = install()
    expect(calls).toEqual(['flush:start'])

    releaseFlush()
    await pending
    expect(calls).toEqual(['flush:start', 'flush:end', 'flag:true', 'install'])
  })

  it('disarms the flag when the installer returns without quitting', async () => {
    const setInstallingUpdate = vi.fn()
    const install = register(async () => {}, setInstallingUpdate)

    await install()
    expect(setInstallingUpdate).toHaveBeenCalledWith(true)
    expect(setInstallingUpdate).not.toHaveBeenCalledWith(false)

    await new Promise<void>((resolve) => setImmediate(resolve))
    expect(setInstallingUpdate).toHaveBeenLastCalledWith(false)
  })
})
