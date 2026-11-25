<div align="center">
  <img src="resources/icons/icon-128.png" alt="Stickie icon" width="84" height="84" />
  <h1>Stickie</h1>
  <p>A fast, local desktop sticky notes app for Linux, Windows, and macOS.</p>
</div>

## Features

- 📝 **Rich text editor:** Bold, italic, underline, strikethrough, text colors, highlighters, bullet lists, numbered lists, interactive checklists, and resizable tables.
- 🖼️ **Images:** Paste from clipboard, drag and drop, or pick from disk, stored locally via `stickie-asset://` with automatic orphan cleanup.
- 🎨 **Themes & colors:** Preset note colors (yellow, green, blue, pink) or custom hex colors with automatic WCAG text contrast, plus system/light/dark UI themes and font switching (`System`, `Sans`, `Serif`, `Mono`).
- 🔍 **Manager window:** Live search with match highlighting, sort by updated date, created date, or title, with import (`.txt`, `.md`, `.html`, `.json`) and export (`.md`, `.json`).
- 💾 **Safe storage:** Atomic writes (`.tmp` with `fsync`, rename, and `.bak` fallback) and flush on exit.
- 🖥️ **Desktop integration:** Multi-monitor bounds safety, optional reopen-notes-on-launch, optional launch-at-login, self-update, and system tray controls.

## Install and Run

### 🐧 Linux (AppImage + Desktop Entry)

```bash
./scripts/install-linux.sh
```

This builds the AppImage and installs it to `~/.local/share/stickie/Stickie.AppImage`, `~/.local/bin/stickie`, and `~/.local/share/applications/stickie.desktop`. Use `--system` to install under `/opt/stickie`, or `--uninstall` to remove it.

To start Stickie:
- Open your desktop application menu, search for **Stickie**, and click it.
- Or run `~/.local/bin/stickie` in a terminal.

### 🪟 Windows

Build the installer with `pnpm run build:win`, run the generated NSIS `.exe` in `dist/`, then open **Stickie** from the Start Menu or Desktop shortcut.

### macOS

The GitHub release has no macOS installer. Build one on a Mac:

```bash
pnpm install
pnpm run build
pnpm exec electron-builder --mac dmg
```

Open the `.dmg` in `dist/`, drag Stickie to Applications, and start it from Applications or Spotlight. The app is unsigned, so macOS may block the first launch. Use right-click → Open, or allow it under System Settings → Privacy & Security.

You need Node.js 24 or newer, pnpm and a Mac. A signed and notarized build also needs an Apple Developer account and a macOS build machine. For development without installing, use `pnpm install && pnpm run dev`.

## Development

Prerequisites: Node.js 24 or newer and pnpm. Local development uses Node.js 26; CI uses 24.

```bash
pnpm install
pnpm run dev
pnpm run typecheck
pnpm run test
```

Packaging and maintenance:

```bash
pnpm run build:appimage
pnpm run build:linux
pnpm run build:win
pnpm audit
```

## Releasing

`./scripts/release.sh` builds the Linux and Windows installers on this machine, then publishes them as a GitHub release tagged `v<version>` from `package.json`. It runs typecheck, tests and the build before packaging. Add `--dry-run` to print the steps without building or publishing.

Release notes list the commits since the previous `v*` tag. You need `gh` installed and logged in. macOS installers need a Mac, so build those separately and attach them to the release.

GitHub Actions runs only when you start it from the Actions tab. Pushes and pull requests do not start a run.

Attach `latest.yml` and `latest-linux.yml` to every release so the in-app updater can find new versions. It reads these unsigned manifests from GitHub and downloads installers from GitHub only. macOS updates are manual. Linux package updates may ask for your password.

## Linux Notes

- **Wayland positioning:** By default on Linux, Stickie relaunches with `--ozone-platform=x11` and hardware acceleration disabled so XWayland preserves per-window `(x, y)` coordinates across restarts. Set `STICKIE_OZONE=wayland` to run natively on Wayland.
- **System tray:** Works out of the box on KDE Plasma and XFCE. On GNOME, install the AppIndicator and KStatusNotifierItem Support extension.
