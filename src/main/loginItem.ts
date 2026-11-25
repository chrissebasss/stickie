import { app } from 'electron'
import { mkdirSync, unlinkSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

export function resolveLinuxAutostartExec(
  appImageEnv: string | undefined = process.env.APPIMAGE,
  execPath: string = process.execPath
): string {
  return appImageEnv && appImageEnv.trim().length > 0 ? appImageEnv : execPath
}

export function buildAutostartDesktopEntry(execPath: string): string {
  const escaped = execPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/%/g, '%%')
  const escapedExec = /[\s"\\]/.test(escaped) ? `"${escaped}"` : escaped
  return [
    '[Desktop Entry]',
    'Type=Application',
    'Version=1.0',
    'Name=Stickie',
    'Comment=Cross-platform desktop sticky notes',
    `Exec=${escapedExec}`,
    'Icon=stickie',
    'Terminal=false',
    'X-GNOME-Autostart-enabled=true',
    ''
  ].join('\n')
}

export function getLinuxAutostartFilePath(
  xdgConfigHome: string | undefined = process.env.XDG_CONFIG_HOME,
  home: string = homedir()
): string {
  const configDir = xdgConfigHome && xdgConfigHome.trim().length > 0 ? xdgConfigHome : join(home, '.config')
  return join(configDir, 'autostart', 'stickie.desktop')
}

export function applyLoginItem(enabled: boolean): void {
  try {
    if (process.platform === 'win32' || process.platform === 'darwin') {
      app.setLoginItemSettings({ openAtLogin: enabled })
      return
    }

    if (process.platform === 'linux') {
      const desktopPath = getLinuxAutostartFilePath()
      if (enabled) {
        mkdirSync(join(desktopPath, '..'), { recursive: true })
        writeFileSync(desktopPath, buildAutostartDesktopEntry(resolveLinuxAutostartExec()), 'utf-8')
      } else {
        try {
          unlinkSync(desktopPath)
        } catch (err: unknown) {
          if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
        }
      }
    }
  } catch (err) {
    console.warn('[LoginItem] Failed to update launch-at-login setting:', err)
  }
}
