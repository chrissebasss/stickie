# AGENTS.md

Instructions for AI agents working in Stickie.

## Stack and Architecture

- **Shell & Build:** Electron 45, `electron-vite`, `electron-builder` 26 (`NSIS` on Windows, `AppImage`/`deb`/`rpm` on Linux).
- **UI & State:** Vue 3 (`<script setup>`), TypeScript strict, Pinia, Tailwind CSS, `lucide-vue-next` SVG icons, `vue-i18n` (`en`, `nb`), TipTap 3 (`StarterKit` includes `Underline`; `TextStyle` and `Table` use named imports).
- **Testing:** Vitest (`pnpm run test`) and TypeScript (`pnpm run typecheck`).
- **Process boundaries:** `src/main/` (Node/Electron), `src/preload/` (`contextBridge` exposing `window.stickie`), `src/shared/` (pure logic and `ipc-contract.ts`), `src/renderer/` (`manager` and `note` Vue apps). Keep `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.

## Key Conventions and Platform Notes

- **Storage & timestamps:** Notes and settings use atomic writes (`.tmp -> fsync -> rename` with `.bak` fallback) and serialized write queues in `NoteStore` and `SettingsStore`. Only bump `updatedAt` when note content (`plainText`, `content`) or `color` changes, never on window move, resize, pin, or open/close.
- **Linux XWayland:** `src/main/index.ts` relaunches with `--ozone-platform=x11` on real `argv` (with `STICKIE_RELAUNCHED=1` guard and `app.disableHardwareAcceleration()`) before `app.requestSingleInstanceLock()` so Chromium initializes Ozone as X11 and preserves per-note positions on Wayland desktops. Overridable via `STICKIE_OZONE=wayland`.
- **Login item:** `src/main/loginItem.ts` uses `app.setLoginItemSettings` on Windows/macOS and `$XDG_CONFIG_HOME/autostart/stickie.desktop` on Linux (preferring `$APPIMAGE` over `process.execPath`).
- **Package management:** `pnpm-workspace.yaml` manages `allowBuilds` (`electron`, `esbuild` true; `electron-winstaller` false) and a temporary `minimatch@>=7.0.0 <11.0.1` override. Run `./scripts/check-minimatch-override.sh` to check if the override can be removed.
- **Packaging config:** `electron-builder` 26 uses `linux.desktop.entry` in `electron-builder.yml`. Use `./scripts/install-linux.sh` to build and install the Linux AppImage, launcher, desktop entry, and icons.

## Skills Workflow

Apply these skills automatically without waiting for the user to invoke them:

- **`ponytail`**: Default for all coding, refactoring, and dependency decisions. Ship the smallest complete change with no unrequested abstractions or bloat.
- **`using-superpowers`**: Check applicable skills before starting work.
- **`systematic-debugging`**: Use for any bug, crash, or unexpected behavior. Trace the root cause in code or logs before editing.
- **`brainstorming`**: Use before building new features, UI changes, or anything with open design choices. Present a short design and get approval before writing code.
- **`ponytail-audit` / `ponytail-review`**: Use when auditing the codebase or reviewing diffs.
- **`security-audit`**: Use when triaging `pnpm audit` advisories or reviewing trust boundaries.
- **`humanizer`**: Use whenever writing or updating documentation (`README.md`, `AGENTS.md`).

## Documentation Maintenance

Keep `README.md` and `AGENTS.md` accurate at all times. Whenever a change alters features, UI behavior, build scripts, packaging, dependencies, or conventions, update the affected sections in `README.md` and `AGENTS.md` using the `humanizer` style before finishing.

## Dependency Maintenance

- **Last checked:** 2026-11-25 (`pnpm audit`: 0 vulnerabilities).
- **When to re-check:** About once a month, or when starting a dependency/security task. Do not run `pnpm outdated` or `pnpm audit` on every routine code edit.
- **Commands:** Run `pnpm outdated`, `pnpm audit`, and `./scripts/check-minimatch-override.sh`. Update the "Last checked" date above after checking or upgrading packages.
