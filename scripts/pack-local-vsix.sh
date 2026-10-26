#!/usr/bin/env bash
# Build a local test .vsix of "H5Web (fork)" from the h5web fork's current HEAD.
#  1. builds and packs @h5web/{app,lib,h5wasm} in $H5WEB_DIR (default ~/h5web)
#  2. copies them to vendor/ as h5web-<pkg>-<version>-<sha>.tgz
#  3. updates package.json, pnpm-workspace.yaml, vendor/SHA256SUMS, vendor/SOURCES
#  4. pnpm install, commits the vendor bump (skip with NO_COMMIT=1)
#  5. packages ~/Downloads/h5web-fork-<sha>.vsix with vsce
# Usage: scripts/pack-local-vsix.sh   (no arguments; nothing is pushed or released)
set -euo pipefail

EXT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
H5WEB_DIR="${H5WEB_DIR:-$HOME/h5web}"
OUT_DIR="${OUT_DIR:-$HOME/Downloads}"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/pack-local-vsix.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

die() { echo "error: $*" >&2; exit 1; }

# --- Find a working pnpm (11.x) and put it on PATH (package scripts call `pnpm`) ---
pnpm_ok() { "$@" -v 2>/dev/null | grep -q '^11\.'; }
if command -v pnpm >/dev/null && pnpm_ok pnpm; then
  :
else
  PNPM_VERSION="$(node -p "require('$H5WEB_DIR/package.json').packageManager.split('@')[1]")"
  mkdir -p "$WORK/bin"
  if command -v corepack >/dev/null && pnpm_ok corepack "pnpm@$PNPM_VERSION"; then
    printf '#!/bin/sh\nexec corepack pnpm@%s "$@"\n' "$PNPM_VERSION" > "$WORK/bin/pnpm"
  else
    printf '#!/bin/sh\nexec npx -y pnpm@%s "$@"\n' "$PNPM_VERSION" > "$WORK/bin/pnpm"
  fi
  chmod +x "$WORK/bin/pnpm"
  pnpm_ok "$WORK/bin/pnpm" || die "no working pnpm (tried PATH, corepack, npx pnpm@$PNPM_VERSION)"
  export PATH="$WORK/bin:$PATH"
fi
node -v | grep -q '^v24\.' || die "Node 24 required (found $(node -v))"
echo "using node $(node -v), pnpm $(pnpm -v)"

# --- Build and pack the h5web packages ---
cd "$H5WEB_DIR"
[ -z "$(git status --porcelain --untracked-files=no)" ] || die "$H5WEB_DIR has uncommitted changes"
SHA="$(git rev-parse --short=7 HEAD)"
echo "packing h5web @ $SHA"
pnpm packages
pnpm --filter '{packages/*}' pack --pack-destination "$WORK/pack" >/dev/null

# --- Copy into vendor/ and update references ---
cd "$EXT_DIR"
OLD="$(node -p "require('./package.json').dependencies['@h5web/app'].match(/-([0-9a-f]{7})\.tgz$/)[1]")"
for pkg in app lib h5wasm; do
  src="$(ls "$WORK"/pack/h5web-$pkg-*.tgz)"
  ver="$(basename "$src" .tgz)"; ver="${ver#h5web-$pkg-}"
  cp "$src" "vendor/h5web-$pkg-$ver-$SHA.tgz"
done
if [ "$OLD" != "$SHA" ]; then
  rm -f vendor/h5web-{app,lib,h5wasm}-*-"$OLD".tgz
  sed -i '' "s/-$OLD\.tgz/-$SHA.tgz/g" package.json pnpm-workspace.yaml
  sed -i '' -e "/^h5web-/s/$OLD/$SHA/g" vendor/SOURCES
fi
# Regenerate SHA256SUMS: keep non-h5web lines, recompute h5web ones
{
  grep -v '  h5web-' vendor/SHA256SUMS || true
  (cd vendor && shasum -a 256 h5web-{app,h5wasm,lib}-*-"$SHA".tgz)
} | LC_ALL=C sort -k2 > "$WORK/sums" && mv "$WORK/sums" vendor/SHA256SUMS
(cd vendor && shasum -a 256 -c SHA256SUMS)

pnpm install --no-frozen-lockfile

if [ -z "${NO_COMMIT:-}" ] && ! git diff --quiet -- package.json pnpm-workspace.yaml pnpm-lock.yaml vendor; then
  git add package.json pnpm-workspace.yaml pnpm-lock.yaml vendor/SHA256SUMS vendor/SOURCES
  git commit -q -F - <<EOF
Bump vendored H5Web to $SHA

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
  echo "committed: $(git log -1 --oneline)"
fi

# --- Package the extension ---
mkdir -p "$OUT_DIR"
VSIX="$OUT_DIR/h5web-fork-$SHA.vsix"
pnpm --allow-build=@vscode/vsce-sign --allow-build=keytar dlx @vscode/vsce package --no-dependencies -o "$VSIX"
ls -lh "$VSIX"
