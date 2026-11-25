import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

const { setLoginItemSettings } = vi.hoisted(() => ({
  setLoginItemSettings: vi.fn()
}))
vi.mock('electron', () => ({
  app: { setLoginItemSettings }
}))

import {
  applyLoginItem,
  buildAutostartDesktopEntry,
  getLinuxAutostartFilePath,
  resolveLinuxAutostartExec
} from '../../src/main/loginItem'

describe('loginItem', () => {
  const origPlatform = process.platform
  const origXdgConfig = process.env.XDG_CONFIG_HOME
  const origAppImage = process.env.APPIMAGE
  let tempConfigDir: string

  beforeEach(() => {
    setLoginItemSettings.mockReset()
    tempConfigDir = mkdtempSync(join(tmpdir(), 'stickie-test-autostart-'))
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: origPlatform })
    if (origXdgConfig === undefined) delete process.env.XDG_CONFIG_HOME
    else process.env.XDG_CONFIG_HOME = origXdgConfig
    if (origAppImage === undefined) delete process.env.APPIMAGE
    else process.env.APPIMAGE = origAppImage
    rmSync(tempConfigDir, { recursive: true, force: true })
  })

  it('prefers APPIMAGE env over process.execPath on Linux', () => {
    expect(resolveLinuxAutostartExec('/opt/Stickie.AppImage', '/tmp/.mount_123/stickie')).toBe(
      '/opt/Stickie.AppImage'
    )
    expect(resolveLinuxAutostartExec(undefined, '/usr/bin/stickie')).toBe('/usr/bin/stickie')
  })

  it('quotes Exec path when it contains spaces', () => {
    const appImagePath = join(tempConfigDir, 'My Apps', 'Stickie.AppImage')
    const entry = buildAutostartDesktopEntry(appImagePath)
    expect(entry).toContain(`Exec="${appImagePath}"`)
    expect(entry).toContain('X-GNOME-Autostart-enabled=true')
  })

  it('escapes desktop-entry special characters in the Exec path', () => {
    const entry = buildAutostartDesktopEntry('/opt/a"b\\c%d/Stickie.AppImage')
    expect(entry).toContain('Exec="/opt/a\\"b\\\\c%%d/Stickie.AppImage"')
  })

  it('calls app.setLoginItemSettings on Windows', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' })
    applyLoginItem(true)
    expect(setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: true })

    applyLoginItem(false)
    expect(setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: false })
  })

  it('writes and removes autostart .desktop file on Linux', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })
    process.env.XDG_CONFIG_HOME = tempConfigDir
    const appImagePath = join(tempConfigDir, 'Stickie.AppImage')
    process.env.APPIMAGE = appImagePath

    const desktopPath = getLinuxAutostartFilePath()
    applyLoginItem(true)
    expect(existsSync(desktopPath)).toBe(true)
    expect(readFileSync(desktopPath, 'utf-8')).toContain(`Exec=${appImagePath}`)

    applyLoginItem(false)
    expect(existsSync(desktopPath)).toBe(false)
  })
})
