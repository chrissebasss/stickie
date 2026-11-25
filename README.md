# Stickie (Stickie)

**Stickie** is a fast, cross-platform (Windows & Linux) desktop sticky notes application built with Electron, Vue 3, TypeScript, Tailwind CSS, and TipTap (ProseMirror).

Designed with a strict zero-data-loss philosophy, Stickie delivers the casual feel of physical sticky notes backed by atomic file-based persistence, disaster recovery, rich formatting, and multi-monitor awareness.

---

## Features

- **Rich Formatting**: Bold, italic, underline, strikethrough, custom text colors, multicolor highlighters, bullet lists, numbered lists, checklists with interactive strike-through, and resizable tables.
- **Images**: Paste images directly from clipboard, drag-and-drop into notes, or select from disk. Stored safely via a privileged custom `stickie-asset://` protocol with automatic orphan asset cleanup.
- **Colors & WCAG Contrast**: 4 presets (yellow, green, blue, pink) with tailored light and dark mode variants, plus a custom color picker. Contrast ratio is computed dynamically (targeting >= 4.5:1) to keep text and top bar icons crystal clear.
- **My Notes Manager**: Live instant search across all notes, snippet highlighting, sort by date/title, 1-click new note creation, delete with confirmation, and "Close all open notes".
- **Multi-Monitor Safety**: Automatically ensures every note's top bar is visible on screen. Unplugging a secondary monitor automatically relocates notes onto the primary monitor's work area with an offset cascade.
- **Zero Data Loss**: Debounced 500ms auto-saves with atomic `.tmp -> fsync -> rename` writes and automatic `.bak` backup rotation. Emergency synchronously flushed on window close, tray quit, `before-quit`, and `SIGTERM`/`SIGINT`. Empty notes on close are safely discarded.
- **Import & Export**: Import multiple `.txt`, `.md`, `.html`, and Stickie `.json` files. Export notes to Markdown or JSON.
- **System Tray**: Quick actions to create notes, open the manager panel, close notes, or quit.

---

## Architecture

Stickie follows Electron's recommended 3-layer architecture with strict security boundaries:

```
src/
├── main/                 # Node.js: window lifecycle, single-instance lock, tray, storage, displays, protocol, IPC
├── preload/              # Secure bridge exposing typed window.stickie via contextBridge
├── shared/               # Pure logic: IPC contract, types, color & contrast math, displays geometry, import/export
└── renderer/             # Vue 3 multi-page renderers
    ├── manager/          # My Notes central dashboard panel
    ├── note/             # Sticky note frameless window with TipTap editor
    ├── components/       # NoteBar, EditorToolbar, NoteCard, modals, color pickers
    └── styles/           # Tailwind CSS & dynamic theming variables
```

**Security Standards**:
- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- Strict Content Security Policy (CSP)
- Strictly-typed IPC contract in `src/shared/ipc-contract.ts`

---

## Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- `pnpm` (v10+ or v12+)

### Installation
```bash
pnpm install
```

### Running in Development
```bash
pnpm run dev
```

### Running Unit Tests & Typecheck
```bash
# Typecheck
pnpm run typecheck

# Unit tests (Vitest)
pnpm run test
```

### Packaging Installers
```bash
# Build for Linux (AppImage + .deb)
pnpm run build:linux

# Build Linux AppImage only
pnpm run build:appimage

# Build for Windows (NSIS installer)
pnpm run build:win
```

### Installing on Linux (AppImage + Desktop Entry)
Works on CachyOS, Arch, Ubuntu, Fedora, and any standard Linux desktop (KDE, GNOME, XFCE, etc.):

```bash
# Build AppImage and install for the current user (~/.local)
./scripts/install-linux.sh

# Or install system-wide (/opt/stickie, /usr/local/bin, /usr/share/applications)
./scripts/install-linux.sh --system

# Uninstall
./scripts/install-linux.sh --uninstall
```

### Dependency & Security Checks
```bash
# Audit dependencies
pnpm audit

# Check whether the minimatch override in pnpm-workspace.yaml is still needed
./scripts/check-minimatch-override.sh
```

---

## Platform Notes & Gotchas

### Linux & Wayland
Wayland compositor security models typically prevent desktop applications from programmatically controlling window placement, which interferes with sticky note position persistence.
- By default, Stickie sets `ozone-platform-hint=x11` on Linux to run seamlessly through X11 or XWayland, guaranteeing exact window restoration and multi-monitor bounds clamping.
- If native Wayland is explicitly desired, launch with:
  ```bash
  STICKIE_OZONE=wayland stickie
  ```

### Linux System Tray
- On KDE Plasma and XFCE, the system tray icon works out-of-the-box via StatusNotifier / AppIndicator.
- On standard GNOME, install the [AppIndicator and KStatusNotifierItem Support](https://extensions.gnome.org/extension/615/appindicator-support/) GNOME extension.
- If no system tray host is detected, Stickie falls back gracefully: closing the manager window quits the application if no sticky notes remain open.

---

## License
MIT

