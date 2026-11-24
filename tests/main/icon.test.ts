import { describe, it, expect, vi } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { getAppIconPath, getTrayIconPath } from '../../src/main/icon'

describe('Application Icon & Tray Resolver', () => {
  it('resolves an existing app icon path', () => {
    const iconPath = getAppIconPath()
    expect(existsSync(iconPath)).toBe(true)
    expect(iconPath.endsWith('icon.png')).toBe(true)
  })

  it('resolves an existing tray icon path', () => {
    const trayPath = getTrayIconPath('tray-24.png')
    expect(existsSync(trayPath)).toBe(true)
    expect(trayPath.endsWith('tray-24.png')).toBe(true)
  })

  it('verifies icon.png has PNG signature and is non-empty', () => {
    const iconPath = getAppIconPath()
    const buf = readFileSync(iconPath)
    expect(buf.length).toBeGreaterThan(1024)
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    expect(buf[0]).toBe(0x89)
    expect(buf[1]).toBe(0x50)
    expect(buf[2]).toBe(0x4e)
    expect(buf[3]).toBe(0x47)
  })

  it('verifies icon.ico exists and has Windows ICO header', () => {
    const icoPath = join(__dirname, '../../resources/icons/icon.ico')
    expect(existsSync(icoPath)).toBe(true)
    const buf = readFileSync(icoPath)
    expect(buf.length).toBeGreaterThan(500)
    // ICO header: 00 00 01 00
    expect(buf[0]).toBe(0x00)
    expect(buf[1]).toBe(0x00)
    expect(buf[2]).toBe(0x01)
    expect(buf[3]).toBe(0x00)
  })
})
