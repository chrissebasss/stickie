import { isNewerVersion, type UpdateCheckResult } from './version'

export function mapUpdateInfo(
  info: { version?: string | null; releaseNotesUrl?: string | null } | null | undefined,
  currentVersion: string,
  fallbackReleaseUrl: string
): UpdateCheckResult {
  const version = info?.version?.trim() || null
  const releaseUrl = info?.releaseNotesUrl || fallbackReleaseUrl

  if (!version) {
    return {
      currentVersion,
      latestVersion: currentVersion,
      hasUpdate: false,
      releaseUrl,
      error: true
    }
  }

  return {
    currentVersion,
    latestVersion: version,
    hasUpdate: isNewerVersion(version, currentVersion),
    releaseUrl
  }
}

export function clampProgress(percent: number): number {
  return Math.min(100, Math.max(0, percent))
}

export function shouldBypassQuitGuard(isInstallingUpdate: boolean): boolean {
  return isInstallingUpdate
}
