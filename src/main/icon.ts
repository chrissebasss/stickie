import { app } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * Returns the absolute path to the main application icon (PNG).
 * Resolves correctly both in local development mode and in packaged production builds.
 */
export function getAppIconPath(): string {
  if (app?.isPackaged) {
    const packagedPath = join(process.resourcesPath, 'icons', 'icon.png')
    if (existsSync(packagedPath)) return packagedPath
  }

  const devPath = join(__dirname, '../../resources/icons/icon.png')
  if (existsSync(devPath)) return devPath

  return join(process.cwd(), 'resources/icons/icon.png')
}

/**
 * Returns the absolute path to a tray icon of a specific filename.
 */
export function getTrayIconPath(name = 'tray-24.png'): string {
  if (app?.isPackaged) {
    const packagedPath = join(process.resourcesPath, 'icons', name)
    if (existsSync(packagedPath)) return packagedPath
  }

  const devPath = join(__dirname, '../../resources/icons', name)
  if (existsSync(devPath)) return devPath

  return join(process.cwd(), 'resources/icons', name)
}
