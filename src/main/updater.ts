import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import { clampProgress, mapUpdateInfo } from '../shared/updateInfo'
import type { UpdateCheckResult } from '../shared/version'

const FALLBACK_RELEASE_URL = 'https://github.com/chrissebasss/stickie/releases/latest'

let progressHandler: ((percent: number) => void) | undefined

function errorResult(): UpdateCheckResult {
  const currentVersion = app.getVersion()
  return {
    currentVersion,
    latestVersion: currentVersion,
    hasUpdate: false,
    releaseUrl: FALLBACK_RELEASE_URL,
    error: true
  }
}

export function configureUpdater(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.on('download-progress', (info) => {
    progressHandler?.(clampProgress(info.percent))
  })
}

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  // No latest-mac.yml is published; mac checks would always fail, so the UI offers the manual release link.
  if (process.platform === 'darwin' || !app.isPackaged) return errorResult()
  try {
    const result = await autoUpdater.checkForUpdates()
    return mapUpdateInfo(result?.updateInfo, app.getVersion(), FALLBACK_RELEASE_URL)
  } catch {
    return errorResult()
  }
}

export async function downloadUpdate(onProgress: (percent: number) => void): Promise<void> {
  progressHandler = onProgress
  try {
    await autoUpdater.downloadUpdate()
  } finally {
    progressHandler = undefined
  }
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall()
}
