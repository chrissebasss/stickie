# AGENTS.md: Building Stickie (desktop sticky notes app)

You are building **Stickie**, a cross-platform (Windows + Linux) desktop sticky notes app. Read this whole file before writing code. Work milestone by milestone (see "Milestones"), keep the app runnable after every milestone, and tick off the acceptance checklist at the end as you go.

---

## 1. Stack decision (already made; do not relitigate)

**Electron + Vue 3 + TypeScript**, not Tauri.

Why: Stickie is window-management heavy (many frameless windows, saved bounds, tray, display add/remove handling, native theme, clipboard images). Electron ships one Chromium everywhere, so behavior is identical on Windows and Linux. Tauri uses WebKitGTK on Linux, which has known problems with transparency, frameless windows, clipboard images and tray behavior. Bundle size is not a priority here.

| Concern | Choice |
|---|---|
| Shell | Electron (latest stable) |
| Build tooling | `electron-vite` (main, preload, renderer in one project) |
| UI | Vue 3 (`<script setup>`), TypeScript strict, Pinia for state |
| Styling | Tailwind CSS + CSS variables for theming |
| Editor | TipTap (ProseMirror) with Vue 3 bindings |
| Packaging | `electron-builder`: NSIS installer (Windows), AppImage + deb (Linux) |
| Tests | Vitest (pure logic), Playwright with Electron (smoke tests) |
| Lint/format | ESLint + Prettier, `tsc --noEmit` in CI |

Package manager: `pnpm` (or `npm` if pnpm is unavailable). Keep dependencies minimal; justify any addition beyond this table in the PR/commit message.

---

## 2. Architecture

Three process layers with strict boundaries:

```
main (Node)       -> windows, tray, storage, display handling, theme, protocol, IPC handlers
preload (bridge)  -> exposes a small typed `window.stickie` API via contextBridge
renderer (Vue)    -> two entry points: "manager" (My notes panel) and "note" (one sticky note)
```

**Security (non-negotiable):** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, a strict CSP, no `remote` module, no arbitrary IPC. Every IPC channel is typed, validated in main, and listed in one `ipc-contract.ts` shared by main and preload.

### Suggested layout

```
src/
  main/
    index.ts              # app lifecycle, single-instance lock
    windows/noteWindow.ts
    windows/managerWindow.ts
    windows/windowManager.ts   # registry: noteId -> BrowserWindow
    tray.ts
    displays.ts           # multi-monitor validation (pure functions + Electron glue)
    store/noteStore.ts    # file-based persistence
    store/settingsStore.ts
    store/assets.ts       # image files + custom protocol
    importExport.ts
    theme.ts
    ipc.ts
  preload/index.ts
  shared/
    ipc-contract.ts
    types.ts              # Note, NoteBounds, Settings
    color.ts              # contrast helpers (pure)
    title.ts              # first-line title derivation (pure)
  renderer/
    manager/              # My notes panel
    note/                 # sticky note window
    components/           # Toolbar, ColorPicker, ConfirmDialog, ...
    styles/
tests/
```

Keep logic that can be pure (contrast math, bounds clamping, title derivation, import parsing) in pure functions with unit tests. Electron glue stays thin.

---

## 3. Data model and storage

Storage root: `app.getPath('userData')/Stickie/`

```
notes/<id>.json
assets/<noteId>/<sha1>.<ext>
settings.json
```

```ts
interface Note {
  schemaVersion: 1;
  id: string;            // uuid v4
  title: string;         // derived from first line, see 4.5
  createdAt: number;     // epoch ms
  updatedAt: number;
  color: NoteColor;      // { kind: 'preset', id: 'yellow'|'green'|'blue'|'pink' } | { kind: 'custom', hex: '#rrggbb' }
  bounds: { x: number; y: number; width: number; height: number };
  content: JSONContent;  // TipTap/ProseMirror JSON (source of truth)
  plainText: string;     // denormalized for search
}

interface Settings {
  schemaVersion: 1;
  theme: 'system' | 'light' | 'dark';
  reopenNotesOnLaunch: boolean;   // default false, see 4.8
  openNoteIds: string[];          // notes open at last exit
  managerBounds: Bounds;
  alwaysOnTop: boolean;           // default false
}
```

Rules:

- **Atomic writes:** write to `<file>.tmp`, `fsync`, then rename over the target. Keep one `.bak` of the previous version. On a parse failure, fall back to `.bak` and log, never crash.
- **Debounced saves:** save 500 ms after the last edit, plus a forced flush on blur, window close, `before-quit`, and Windows `session-end`. Also handle `SIGTERM`/`SIGINT` on Linux.
- Load all notes into an in-memory index at startup (id, title, updatedAt, color, plainText snippet). Load full content lazily when a note window opens.
- Include `schemaVersion` everywhere and write a tiny migration runner now, even if empty.

---

## 4. Feature specs and implementation notes

### 4.1 Rich text editor (TipTap)

Use TipTap extensions: StarterKit (bold, italic, strike, bullet list, ordered list, history, etc.), `Underline` (skip if already included in the installed StarterKit version), `TextStyle` + `Color`, `Highlight` with `multicolor: true`, `Table` + `TableRow` + `TableHeader` + `TableCell` (resizable columns), `TaskList` + `TaskItem` with `nested: true`, `Image`, `Placeholder`.

Toolbar (compact, fits a small note, can wrap or scroll horizontally): bold, italic, underline, strikethrough, text color, highlighter, bullet list, numbered list, checklist, table (insert + row/column add/remove/delete table contextual controls), image. Keyboard shortcuts: Ctrl+B / I / U, Ctrl+Shift+X (strike), Ctrl+Shift+7/8/9 (lists/checklist). Toolbar can be hidden/shown per note to maximize space.

Text color and highlight each offer a small swatch palette plus a custom color input.

### 4.2 Lists and checklists

- Bulleted, numbered, and checklist items, all nestable with Tab / Shift+Tab.
- Clicking a checkbox toggles it. Checked items render with `text-decoration: line-through` and reduced opacity. The state persists in the document JSON.
- Typing `- `, `1. `, or `[ ] ` at line start should auto-convert (TipTap input rules).

### 4.3 Move, resize, remember

- Note windows are frameless (`frame: false`) with a custom top bar (the "color bar") that contains a drag region (`-webkit-app-region: drag`) and buttons: new note, color, pin (always on top), close.
- Windows must stay natively resizable (`resizable: true`), with a minimum size (e.g. 220x180).
- Persist bounds on `move` and `resize` events, debounced (~400 ms). Use `getNormalBounds()` so maximized/minimized state does not corrupt saved bounds.
- When a note is opened (from the panel, tray, or a restore), it uses its saved bounds after passing the multi-monitor check in 4.9.
- New notes: default size about 320x360, cascaded from the last created note so they do not stack exactly.

### 4.4 Colors and automatic contrast

- Four presets: yellow, green, blue, pink. Each has a light-theme and a dark-theme variant (softer in dark mode).
- A "custom" option opens a full color picker (native `<input type="color">` plus a hex field, or a small Vue color picker if it is dependency-light).
- Color is **per note** and stored in the note.
- Implement `shared/color.ts` with: hex parsing, WCAG relative luminance, contrast ratio, `pickTextColor(bg)` that returns near-black or white, whichever has the higher contrast ratio (target at least 4.5:1), and `deriveBarColor(bg)` that returns a slightly darker (or lighter, for very dark backgrounds) shade of the note color for the top bar. The bar's icons and text also use `pickTextColor(barColor)`.
- Apply colors via CSS variables set on the note root (`--note-bg`, `--note-fg`, `--bar-bg`, `--bar-fg`). Table borders, checkbox outlines, placeholder text, and selection color should derive from `--note-fg` so they remain readable on any color.
- Unit test contrast for pure white, pure black, mid-gray, saturated yellow, and saturated blue.

### 4.5 Auto-save and naming

- Every note with content is saved automatically and continuously (see section 3), and always flushed on exit.
- **Title = first non-empty line of plain text**, trimmed, collapsed whitespace, max about 60 chars, with an ellipsis if truncated. If the note has only an image or only non-text content, use "Untitled note".
- A note with no text and no images when its window closes is **discarded** (file deleted), not saved. A note with any content is never discarded without explicit user deletion.
- Title and `plainText` are recomputed on each save and update the in-memory index so the manager panel stays live.

### 4.5b No-data-loss rule

"We should always save." Treat data loss as the worst possible bug. Never delete a note file except through an explicit user delete action or the empty-note discard above. Flush synchronously on `before-quit` (block quit until pending writes finish). Add a test that kills the app mid-edit (simulate by flushing and reloading) and verifies content survives.

### 4.6 My notes panel (manager window)

- Normal framed window (or lightly styled), remembers its own bounds.
- List of all notes (card or row per note): colored swatch, title, snippet, last modified. Sort by last modified descending by default, with a sort toggle.
- **Search:** live, case-insensitive, matches title and full plain text, highlights matches in the snippet.
- **Open:** double-click or button opens the note window (focuses it if already open).
- **Delete:** with a confirmation dialog (or a 10 s undo toast). Also deletes the note's assets folder.
- **Import:** file picker supporting `.txt`, `.md`, `.html` (convert to TipTap JSON, sanitizing HTML) and Stickie's own `.json` export. Multiple selection allowed. Each file becomes a new note, the title coming from the first line or the filename.
- **Export (bonus, cheap to add):** a note as `.json` (with inline images as data URIs) or `.md`.
- **New note** button, prominent, one click.
- Also shows a tray-like quick action: "Close all open notes".

### 4.7 Theme

- Settings: System (default), Light, Dark. Implement with `nativeTheme.themeSource`, and send the resolved theme to all renderers via IPC on `nativeTheme` `updated`.
- UI chrome (manager panel, toolbar, dialogs) uses CSS variables switched by a `data-theme` attribute. Note colors follow 4.4 (preset dark variants in dark mode).
- Theme control lives in the manager panel (gear/settings menu) and in the tray menu is not required.

### 4.8 Startup behavior

- **Always opens the My notes panel on every launch.** Do not auto-open note windows by default.
- Use `app.requestSingleInstanceLock()`. If a second instance launches, focus the manager panel of the first.
- Optional setting `reopenNotesOnLaunch` (default **off**) reopens notes that were open at last exit, in addition to the manager panel.
- Offer "Launch at login" as an optional setting (`app.setLoginItemSettings` on Windows; an autostart `.desktop` file on Linux). Default off.

### 4.9 Multi-monitor safety

Implement as a pure function plus Electron glue:

```ts
// displays.ts (pure part)
function ensureVisible(bounds: Bounds, workAreas: Rect[], primary: Rect): Bounds
```

- A note is considered visible if at least a 100x40 px region of its **top bar** intersects some display's `workArea`. Otherwise, move it to the primary display's work area (cascade offset so multiple relocated notes do not overlap exactly), and clamp the size to fit.
- Run the check: (a) when opening any note window, (b) on startup for the manager window, (c) on `screen` events `display-removed`, `display-metrics-changed`, and `display-added` for every open window, and (d) after resume from sleep (`powerMonitor` `resume`).
- Update the stored bounds after relocating, so the new position persists.
- Remember Electron bounds are in DIPs. Do not manually multiply by scale factor.
- Unit test: window fully on a removed second monitor (left and right of primary, negative coordinates), partially offscreen, larger than the work area.

### 4.10 System tray

- Tray icon with menu: **New note**, **My notes**, **Close all notes** (closes note windows but keeps the app and tray running; notes are saved first), separator, **Quit**.
- Left click: toggle/show the manager panel (Windows). On Linux, click behavior varies by desktop environment, so rely on the menu.
- Closing the manager panel hides it to tray rather than quitting if the tray exists. Quit only from the tray menu or Ctrl+Q.
- Provide tray icons as template-quality PNGs (16/24/32/48) plus `.ico` for Windows. Support a light and dark variant of the icon.
- If tray creation fails or the Linux desktop has no StatusNotifier support (e.g. stock GNOME), fall back gracefully: closing the manager quits only when no notes are open, and log a one-time note.

### 4.11 Images

- **Pick from system:** toolbar button calls `dialog.showOpenDialog` in main (filters png, jpg, jpeg, gif, webp, svg). Main copies the file into `assets/<noteId>/<sha1>.<ext>` and returns a URL.
- **Paste from clipboard:** handle ProseMirror's paste event. If `clipboardData` contains image items, read the bytes, send to main via IPC, store as PNG, insert the image node. Also support drag-and-drop of image files into the note.
- Images are referenced in the document by a custom protocol URL, e.g. `stickie-asset://<noteId>/<file>`. Register it with `protocol.handle` (and `registerSchemesAsPrivileged` for `secure`, `supportFetchAPI`). Never store base64 images in the note JSON.
- Limit each image to a sane max (e.g. downscale anything above 4096 px on the long side, reject files above ~25 MB with a friendly message).
- Images should be resizable inside the note (TipTap's image resize option or a small custom node view) and never overflow the note width by default.
- Orphan cleanup: on note save, remove asset files no longer referenced by the document; on note delete, remove the asset folder.

---

## 5. Platform notes and gotchas

- **Linux + Wayland:** Wayland does not let apps position their own windows, which breaks "remember position". Default to X11/XWayland on Linux: `app.commandLine.appendSwitch('ozone-platform-hint', 'x11')` or set `ozone-platform=x11` before `app.whenReady()`. Make this a documented, overridable choice (env var `STICKIE_OZONE=wayland`).
- **Linux tray:** needs StatusNotifier/AppIndicator support. KDE works out of the box; GNOME requires the AppIndicator extension. Document in README.
- **Frameless windows on Windows:** keep native resize borders working. Verify snap layouts and Aero shake do not misbehave. Set `skipTaskbar` for note windows if you want them to share one taskbar entry with the manager; otherwise leave them visible and test alt-tab.
- **Transparent windows:** avoid `transparent: true` (flaky on Linux). Use a solid colored window background plus CSS rounded corners only if it looks right without transparency.
- **Fonts:** use a system font stack. Do not bundle fonts unless needed.
- **Building installers:** build Windows artifacts on Windows and Linux artifacts on Linux using a GitHub Actions matrix. Do not depend on Wine for cross-building.
- **Dev machine caveat:** if you are developing on Linux, you cannot test Windows-only behavior (session-end, taskbar, tray). Keep those code paths small, isolated, and covered by unit tests where possible, and list them in the PR as "needs manual verification on Windows".

---

## 6. UX and design guidelines

- Sticky-note feel: soft shadow, slightly rounded corners, generous padding, readable default font size (14-15 px), no heavy chrome. The top bar is slim and only reveals its buttons on hover or focus to maximize writing space (always visible for keyboard users on focus).
- Everything usable by keyboard. Visible focus rings. Respect `prefers-reduced-motion`.
- Accessible labels on all icon buttons. Tooltips on hover.
- No modal dialogs inside note windows except for destructive confirmations.
- Strings go through Vue I18n from day one (English default; structure ready for more languages).

---

## 7. Milestones

Complete in order. After each, the app must launch and not lose data. Commit per milestone with a clear message.

1. **Scaffold:** electron-vite + Vue 3 + TS + Tailwind, lint/format/typecheck scripts, single-instance lock, typed IPC contract, secure window defaults.
2. **Storage:** note store with atomic writes, `.bak` fallback, in-memory index, settings store, unit tests.
3. **Note window:** frameless window, drag bar, close, TipTap with basic marks, auto-save, title derivation, empty-note discard.
4. **Bounds persistence:** save/restore position and size, cascade for new notes.
5. **Manager panel:** list, search, open, delete (with confirm/undo), new note, launch behavior (always opens on start).
6. **Rich formatting:** underline, strike, color, highlight, lists, checklists, tables, toolbar polish.
7. **Colors and theme:** presets, custom picker, contrast helpers with tests, per-note color, light/dark/system theme.
8. **Images:** file picker, clipboard paste, drag-drop, asset protocol, resize, orphan cleanup.
9. **Tray + multi-monitor:** tray menu, close all, display-event handling with tests.
10. **Import/export:** txt, md, html, Stickie json.
11. **Hardening:** flush-on-exit for every exit path, crash/kill recovery test, Playwright smoke tests, accessibility pass.
12. **Packaging:** electron-builder configs, GitHub Actions matrix, README (install, build, Wayland and tray notes), app icons.

---

## 8. Acceptance checklist

- [ ] Bold, italic, underline, strikethrough, text color, highlighter all work and persist
- [ ] Tables can be inserted, edited (add/remove rows and columns), and persist
- [ ] Bulleted, numbered, and checklists work; clicking a checkbox strikes the line through and persists
- [ ] Position and size of every note are restored after restart
- [ ] Four presets plus full color picker; top bar and text contrast adjust automatically (at least 4.5:1)
- [ ] Color is settable per note and persists
- [ ] My notes panel: browse, search, import, open, delete
- [ ] Every note with content is auto-saved, named after its first line, including on every exit path (window close, tray quit, Ctrl+Q, OS logout/shutdown, SIGTERM)
- [ ] Light, dark, and follow-system themes work and switch live
- [ ] Tray icon: new note, close all notes, my notes, quit
- [ ] The app always starts on the My notes panel
- [ ] Unplugging a monitor moves its notes to the primary display automatically (live and on next launch)
- [ ] Images can be added from file picker, clipboard paste, and drag-drop; they persist and are cleaned up on delete
- [ ] Windows installer (NSIS) and Linux AppImage/deb build in CI
- [ ] No data loss in kill/crash recovery test
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` all pass

---

## 9. Working agreements for the agent

- Ask before changing the stack or adding major dependencies. Otherwise, make reasonable decisions and note them in `DECISIONS.md`.
- Prefer small, reviewable commits. Do not refactor unrelated code.
- Write tests for pure logic as you go; do not leave them for the end.
- When something cannot be verified in your environment (Windows behavior, multi-monitor hardware), say so explicitly and provide a manual test script in `MANUAL_TESTS.md`.
- Never invent library APIs. Check the installed version's docs or type definitions (TipTap, Electron, electron-builder change often).
- Keep a running `PROGRESS.md` with milestone status and open questions.