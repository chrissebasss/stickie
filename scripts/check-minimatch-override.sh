#!/usr/bin/env bash
set -euo pipefail

# Checks whether the minimatch override in pnpm-workspace.yaml is still needed
# by resolving dependencies in a temporary directory without the override.

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cp "$ROOT/package.json" "$TMP/package.json"
grep -v "minimatch@" "$ROOT/pnpm-workspace.yaml" | sed '/^overrides:[[:space:]]*$/d' >"$TMP/pnpm-workspace.yaml"

cd "$TMP"
pnpm install --lockfile-only --ignore-scripts >/dev/null

if pnpm audit --audit-level=moderate >/dev/null 2>&1; then
  echo "Override no longer needed: pnpm audit passed without the minimatch override."
  exit 0
else
  echo "Override still needed: upstream packages still pull a vulnerable minimatch:"
  pnpm audit --audit-level=moderate || true
  exit 1
fi
