#!/usr/bin/env bash
set -euo pipefail

# Builds the Linux and Windows installers on this machine and publishes them
# as a GitHub release. The version in package.json is the single source of truth.

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

VERSION="$(node -p "require('./package.json').version")"
TAG="v${VERSION}"

if ! command -v gh >/dev/null 2>&1; then
  echo "Install the GitHub CLI (gh) before releasing." >&2
  exit 1
fi

DIRTY="$(git status --porcelain)"
if [[ -n "$DIRTY" ]]; then
  if $DRY_RUN; then
    echo "Warning: working tree is not clean. Commit before a real release." >&2
  else
    echo "Working tree is not clean. Commit first." >&2
    exit 1
  fi
fi

if git rev-parse -q --verify "refs/tags/${TAG}" >/dev/null; then
  if $DRY_RUN; then
    echo "Warning: tag ${TAG} already exists." >&2
  else
    echo "Tag ${TAG} already exists." >&2
    exit 1
  fi
fi

PREV_TAG="$(git describe --tags --abbrev=0 --match 'v*' 2>/dev/null || true)"
NOTES="$(mktemp)"
trap 'rm -f "$NOTES"' EXIT
{
  printf '# Stickie %s\n\n## Changes\n\n' "$VERSION"
  if [[ -n "$PREV_TAG" ]]; then
    git log --no-merges --pretty=format:'- %s' "${PREV_TAG}..HEAD"
  else
    git log --no-merges --pretty=format:'- %s'
  fi
  printf '\n'
} >"$NOTES"

run() {
  if $DRY_RUN; then
    printf '+ %s\n' "$*"
  else
    "$@"
  fi
}

run pnpm run typecheck
run pnpm run test
run pnpm run build
run pnpm exec electron-builder --linux AppImage deb rpm --publish never
run pnpm exec electron-builder --win nsis --publish never

ASSETS=(
  "dist/Stickie-${VERSION}.AppImage"
  "dist/stickie_${VERSION}_amd64.deb"
  "dist/stickie-${VERSION}.x86_64.rpm"
  "dist/Stickie-Setup-${VERSION}.exe"
  "dist/latest.yml"
  "dist/latest-linux.yml"
  "dist/Stickie-Setup-${VERSION}.exe.blockmap"
)
for asset in "${ASSETS[@]}"; do
  if [[ ! -f "$asset" ]] && ! $DRY_RUN; then
    echo "Missing installer: ${asset}" >&2
    exit 1
  fi
done

run gh release create "$TAG" "${ASSETS[@]}" \
  --title "Stickie ${VERSION}" \
  --notes-file "$NOTES"

if $DRY_RUN; then
  echo "Dry run complete. Nothing was published."
else
  echo "Release ${TAG} published."
fi
