import { describe, it, expect, vi, beforeEach } from 'vitest'

const { appMock, updaterMock } = vi.hoisted(() => ({
  appMock: { isPackaged: false, getVersion: () => '0.1.3' },
  updaterMock: {
    autoDownload: true,
    autoInstallOnAppQuit: true,
    on: vi.fn(),
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn().mockResolvedValue([]),
    quitAndInstall: vi.fn()
  }
}))

vi.mock('electron', () => ({ app: appMock }))
vi.mock('electron-updater', () => ({ autoUpdater: updaterMock }))

import { configureUpdater, checkForUpdates, downloadUpdate, installUpdate } from '@main/updater'

describe('updater wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appMock.isPackaged = false
  })

  it('returns a dev-mode result in unpacked builds without contacting GitHub', async () => {
    const result = await checkForUpdates()
    expect(result.error).toBe(true)
    expect(result.devMode).toBe(true)
    expect(result.hasUpdate).toBe(false)
    expect(result.latestVersion).toBe('0.1.3')
    expect(updaterMock.checkForUpdates).not.toHaveBeenCalled()
  })

  it('disables automatic updates and clamps forwarded progress', async () => {
    configureUpdater()
    expect(updaterMock.autoDownload).toBe(false)
    expect(updaterMock.autoInstallOnAppQuit).toBe(false)

    const listener = updaterMock.on.mock.calls.find(([event]) => event === 'download-progress')?.[1] as
      | ((info: { percent: number }) => void)
      | undefined
    expect(listener).toBeTypeOf('function')

    updaterMock.downloadUpdate.mockImplementationOnce(async () => {
      listener?.({ percent: 140 })
      listener?.({ percent: -5 })
    })
    const progress = vi.fn()
    await downloadUpdate(progress)
    expect(progress.mock.calls).toEqual([[100], [0]])

    listener?.({ percent: 50 })
    expect(progress).toHaveBeenCalledTimes(2)
  })

  it('delegates install to quitAndInstall', () => {
    installUpdate()
    expect(updaterMock.quitAndInstall).toHaveBeenCalledOnce()
  })

  it('skips the updater on macOS and leaves the release link for the UI', async () => {
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })
    try {
      appMock.isPackaged = true
      const result = await checkForUpdates()

      expect(result).toMatchObject({ error: true, hasUpdate: false, manualOnly: true })
      expect(result.releaseUrl).toBe('https://github.com/chrissebasss/stickie/releases/latest')
      expect(updaterMock.checkForUpdates).not.toHaveBeenCalled()
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
    }
  })
})
