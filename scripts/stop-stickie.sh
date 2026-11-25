#!/usr/bin/env bash
set -euo pipefail

# Stop Stickie instances that hold the single-instance lock before `pnpm run dev`.
# Match the running executable, not just its command line, so unrelated Electron
# apps are left alone.

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ELECTRON_BIN="$(node -p "require('electron')" 2>/dev/null || true)"
if [[ -n "$ELECTRON_BIN" ]]; then
  ELECTRON_BIN="$(readlink -f "$ELECTRON_BIN" 2>/dev/null || echo "$ELECTRON_BIN")"
fi
APPIMAGE_DEST="${XDG_DATA_HOME:-$HOME/.local/share}/stickie/Stickie.AppImage"

find_pids() {
  if ! command -v pgrep >/dev/null 2>&1; then
    return 0
  fi
  {
    pgrep -x stickie 2>/dev/null || true
    if [[ -n "$ELECTRON_BIN" ]]; then
      pgrep -f -- "$ELECTRON_BIN" 2>/dev/null || true
    fi
  } | while read -r pid; do
    exe="$(readlink -f "/proc/$pid/exe" 2>/dev/null || true)"
    case "$exe" in
      "$ELECTRON_BIN"|"$APPIMAGE_DEST"|*/.mount_*/stickie) echo "$pid" ;;
    esac
  done | awk -v self="$$" '$1 != "" && $1 != self && !seen[$1]++'
}

pids="$(find_pids)"
if [[ -z "$pids" ]]; then
  echo "No running Stickie instance found."
  exit 0
fi

echo "Stopping running Stickie instance(s): $pids"
kill -TERM $pids 2>/dev/null || true
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if [[ -z "$(find_pids)" ]]; then
    exit 0
  fi
  sleep 0.2
done

pids="$(find_pids)"
if [[ -n "$pids" ]]; then
  echo "Force stopping: $pids"
  kill -KILL $pids 2>/dev/null || true
fi
