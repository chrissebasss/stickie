#!/usr/bin/env bash
set -euo pipefail

# Stickie Linux Installer (AppImage + XDG Desktop Entry + Hicolor Icons)
# Works on CachyOS/Arch (KDE/GNOME/etc.) and any standard Linux distribution.

APP_NAME="Stickie"
APP_ID="stickie"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

SYSTEM_INSTALL=false
SKIP_BUILD=false
UNINSTALL=false
CUSTOM_APPIMAGE=""

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Build (if needed) and install ${APP_NAME} as an AppImage with a desktop entry
and application icons.

Options:
  --system             Install system-wide (/opt/${APP_ID}, /usr/local/bin, /usr/share)
                       instead of user-local (~/.local)
  --skip-build         Use an existing AppImage in dist/ without rebuilding
  --appimage <path>    Install from a specific .AppImage file
  --uninstall          Remove the installed AppImage, launcher, desktop entry, and icons
  -h, --help           Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --system)
      SYSTEM_INSTALL=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --appimage)
      if [[ $# -lt 2 ]]; then
        echo "Error: --appimage requires a file path." >&2
        exit 1
      fi
      CUSTOM_APPIMAGE="$2"
      shift 2
      ;;
    --uninstall)
      UNINSTALL=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ "$SYSTEM_INSTALL" == true ]]; then
  if [[ "$EUID" -ne 0 ]]; then
    if command -v sudo >/dev/null 2>&1; then
      SUDO="sudo"
    else
      echo "Error: --system requires root privileges (or sudo)." >&2
      exit 1
    fi
  else
    SUDO=""
  fi
  APP_DIR="/opt/${APP_ID}"
  BIN_DIR="/usr/local/bin"
  APPLICATIONS_DIR="/usr/share/applications"
  ICONS_DIR="/usr/share/icons"
else
  SUDO=""
  XDG_DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
  APP_DIR="${XDG_DATA_HOME}/${APP_ID}"
  BIN_DIR="$HOME/.local/bin"
  APPLICATIONS_DIR="${XDG_DATA_HOME}/applications"
  ICONS_DIR="${XDG_DATA_HOME}/icons"
fi

APPIMAGE_DEST="${APP_DIR}/Stickie.AppImage"
BIN_DEST="${BIN_DIR}/${APP_ID}"
DESKTOP_DEST="${APPLICATIONS_DIR}/${APP_ID}.desktop"

refresh_desktop_caches() {
  if command -v update-desktop-database >/dev/null 2>&1; then
    $SUDO update-desktop-database "$APPLICATIONS_DIR" >/dev/null 2>&1 || true
  fi
  if command -v gtk-update-icon-cache >/dev/null 2>&1 && [[ -d "${ICONS_DIR}/hicolor" ]]; then
    $SUDO gtk-update-icon-cache -f -t "${ICONS_DIR}/hicolor" >/dev/null 2>&1 || true
  fi
  # Refresh KDE Plasma menu cache if available
  if [[ "$SYSTEM_INSTALL" == false ]]; then
    if command -v kbuildsycoca6 >/dev/null 2>&1; then
      kbuildsycoca6 --noincremental >/dev/null 2>&1 || true
    elif command -v kbuildsycoca5 >/dev/null 2>&1; then
      kbuildsycoca5 --noincremental >/dev/null 2>&1 || true
    fi
  fi
}

if [[ "$UNINSTALL" == true ]]; then
  echo "Uninstalling ${APP_NAME}..."
  $SUDO rm -f "$APPIMAGE_DEST" "$BIN_DEST" "$DESKTOP_DEST"
  $SUDO rmdir "$APP_DIR" >/dev/null 2>&1 || true
  for size in 16 24 32 48 64 128 256 512; do
    $SUDO rm -f "${ICONS_DIR}/hicolor/${size}x${size}/apps/${APP_ID}.png"
  done
  $SUDO rm -f "${ICONS_DIR}/hicolor/scalable/apps/${APP_ID}.svg"
  refresh_desktop_caches
  echo "${APP_NAME} has been uninstalled."
  exit 0
fi

find_existing_appimage() {
  local dir="$1"
  if [[ -d "$dir" ]]; then
    find "$dir" -maxdepth 1 -type f -name '*.AppImage' | sort -V | tail -n 1
  fi
}

APPIMAGE_SRC=""

if [[ -n "$CUSTOM_APPIMAGE" ]]; then
  if [[ ! -f "$CUSTOM_APPIMAGE" ]]; then
    echo "Error: AppImage not found at: $CUSTOM_APPIMAGE" >&2
    exit 1
  fi
  APPIMAGE_SRC="$CUSTOM_APPIMAGE"
elif [[ "$SKIP_BUILD" == true ]]; then
  APPIMAGE_SRC="$(find_existing_appimage "${PROJECT_ROOT}/dist")"
  if [[ -z "$APPIMAGE_SRC" ]]; then
    echo "Error: No .AppImage found in ${PROJECT_ROOT}/dist. Run without --skip-build to build it." >&2
    exit 1
  fi
else
  if [[ ! -f "${PROJECT_ROOT}/package.json" ]]; then
    echo "Error: package.json not found in ${PROJECT_ROOT}. Pass --appimage <path> to install a prebuilt AppImage." >&2
    exit 1
  fi

  cd "$PROJECT_ROOT"

  if command -v pnpm >/dev/null 2>&1; then
    PKG_MGR="pnpm"
  elif command -v npm >/dev/null 2>&1; then
    PKG_MGR="npm"
  else
    echo "Error: Neither pnpm nor npm was found in PATH. Install Node.js and pnpm, or pass --appimage <path>." >&2
    exit 1
  fi

  if [[ ! -d "${PROJECT_ROOT}/node_modules" ]]; then
    echo "Installing dependencies with ${PKG_MGR}..."
    "$PKG_MGR" install
  fi

  echo "Building ${APP_NAME} AppImage..."
  if [[ "$PKG_MGR" == "pnpm" ]]; then
    pnpm run build:appimage
  else
    npm run build -- && npx electron-builder --linux AppImage
  fi

  APPIMAGE_SRC="$(find_existing_appimage "${PROJECT_ROOT}/dist")"
  if [[ -z "$APPIMAGE_SRC" ]]; then
    echo "Error: Build succeeded but no .AppImage was found in ${PROJECT_ROOT}/dist." >&2
    exit 1
  fi
fi

echo "Installing ${APP_NAME} from ${APPIMAGE_SRC}..."

find_running_stickie_pids() {
  if ! command -v pgrep >/dev/null 2>&1; then
    return 0
  fi
  {
    pgrep -x stickie 2>/dev/null || true
  } | while read -r pid; do
    exe="$(readlink -f "/proc/$pid/exe" 2>/dev/null || true)"
    case "$exe" in
      "$APPIMAGE_DEST"|*/.mount_*/stickie) echo "$pid" ;;
    esac
  done | awk -v self="$$" '$1 != "" && $1 != self && !seen[$1]++'
}

stop_running_stickie() {
  local pids
  pids="$(find_running_stickie_pids)"
  if [[ -n "$pids" ]]; then
    echo "Stopping running ${APP_NAME} instance(s)..."
    $SUDO kill -TERM $pids 2>/dev/null || true
    for _ in 1 2 3 4 5 6; do
      if [[ -z "$(find_running_stickie_pids)" ]]; then
        return 0
      fi
      sleep 0.5
    done
    pids="$(find_running_stickie_pids)"
    if [[ -n "$pids" ]]; then
      $SUDO kill -KILL $pids 2>/dev/null || true
    fi
  fi
}

stop_running_stickie
$SUDO mkdir -p "$APP_DIR" "$BIN_DIR" "$APPLICATIONS_DIR"

$SUDO install -m 0755 "$APPIMAGE_SRC" "$APPIMAGE_DEST"

# Create a lightweight launcher script that automatically falls back to
# APPIMAGE_EXTRACT_AND_RUN=1 on systems without libfuse.so.2 (e.g. Ubuntu 24.04+).
LAUNCHER_TMP="$(mktemp)"
cat >"$LAUNCHER_TMP" <<EOF
#!/usr/bin/env sh
set -eu
unset ELECTRON_RUN_AS_NODE
APPIMAGE="${APPIMAGE_DEST}"
if [ -z "\${APPIMAGE_EXTRACT_AND_RUN:-}" ]; then
  if grep -qE '^NoNewPrivs:[[:space:]]*1\$' /proc/self/status 2>/dev/null || \
     (command -v ldconfig >/dev/null 2>&1 && ! ldconfig -p 2>/dev/null | grep -q 'libfuse\.so\.2'); then
    export APPIMAGE_EXTRACT_AND_RUN=1
  fi
fi
exec "\$APPIMAGE" "\$@"
EOF
$SUDO install -m 0755 "$LAUNCHER_TMP" "$BIN_DEST"
rm -f "$LAUNCHER_TMP"

# Install hicolor icons (PNG sizes + scalable SVG)
ICON_SRC_DIR="${PROJECT_ROOT}/resources/icons"
if [[ -d "$ICON_SRC_DIR" ]]; then
  for size in 16 24 32 48 64 128 256 512; do
    if [[ -f "${ICON_SRC_DIR}/icon-${size}.png" ]]; then
      $SUDO mkdir -p "${ICONS_DIR}/hicolor/${size}x${size}/apps"
      $SUDO install -m 0644 "${ICON_SRC_DIR}/icon-${size}.png" "${ICONS_DIR}/hicolor/${size}x${size}/apps/${APP_ID}.png"
    fi
  done
  if [[ -f "${ICON_SRC_DIR}/icon.svg" ]]; then
    $SUDO mkdir -p "${ICONS_DIR}/hicolor/scalable/apps"
    $SUDO install -m 0644 "${ICON_SRC_DIR}/icon.svg" "${ICONS_DIR}/hicolor/scalable/apps/${APP_ID}.svg"
  fi
fi

# Create XDG desktop entry
DESKTOP_TMP="$(mktemp)"
cat >"$DESKTOP_TMP" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Stickie
GenericName=Sticky Notes
Comment=Cross-platform desktop sticky notes
Exec=${BIN_DEST} %U
Icon=${APP_ID}
Terminal=false
Categories=Utility;TextEditor;
Keywords=notes;sticky;memo;todo;markdown;
StartupNotify=true
StartupWMClass=stickie
EOF
$SUDO install -m 0644 "$DESKTOP_TMP" "$DESKTOP_DEST"
rm -f "$DESKTOP_TMP"

refresh_desktop_caches

echo ""
echo "${APP_NAME} installed successfully!"
echo "  AppImage:      ${APPIMAGE_DEST}"
echo "  Launcher:      ${BIN_DEST}"
echo "  Desktop entry: ${DESKTOP_DEST}"

if [[ "$SYSTEM_INSTALL" == false ]]; then
  case ":${PATH}:" in
    *":${BIN_DIR}:"*) ;;
    *)
      echo ""
      echo "Note: ${BIN_DIR} is not in your PATH."
      echo "Add it to your shell config if you want to run '${APP_ID}' from a terminal:"
      echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
      ;;
  esac
fi
