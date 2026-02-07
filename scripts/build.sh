#!/usr/bin/env bash

set -euxo pipefail

if [ -d "dist" ]; then
  rm -rf dist
fi

pnpm exec next build

# Copy static assets and public into standalone before packaging
cp -r .next/static .next/standalone/.next/
if [ -d "public" ]; then
  cp -r public .next/standalone/
fi

# Copy standalone into dist/standalone/ with symlinks fully resolved
mkdir -p ./dist
cp -rL .next/standalone ./dist/standalone

# Fix pnpm virtual store: hoist all nested packages to top-level node_modules
# pnpm stores peer/nested deps inside .pnpm/pkg@ver/node_modules/ which Node.js
# cannot resolve from the top-level packages. We need to copy them up.
STANDALONE_NM="./dist/standalone/node_modules"
PNPM_STORE="$STANDALONE_NM/.pnpm"

if [ -d "$PNPM_STORE" ]; then
  # Find all package directories inside .pnpm/*/node_modules/ and hoist them
  find "$PNPM_STORE" -mindepth 3 -maxdepth 3 -type d | while read -r pkg_path; do
    # Extract package name (handles scoped packages like @swc/helpers)
    parent=$(basename "$(dirname "$pkg_path")")
    pkg_name=$(basename "$pkg_path")

    if [ "$parent" = "node_modules" ]; then
      # Non-scoped package: .pnpm/foo@1.0/node_modules/foo
      if [ ! -d "$STANDALONE_NM/$pkg_name" ] && [ "$pkg_name" != ".pnpm" ]; then
        cp -r "$pkg_path" "$STANDALONE_NM/$pkg_name"
      fi
    elif [[ "$parent" == @* ]]; then
      # Scoped package: .pnpm/foo@1.0/node_modules/@scope/pkg
      # parent dir is one level up, we need the scope
      scope_dir="$(dirname "$pkg_path")"
      scope_name="$(basename "$scope_dir")"
      if [[ "$scope_name" == @* ]]; then
        mkdir -p "$STANDALONE_NM/$scope_name"
        if [ ! -d "$STANDALONE_NM/$scope_name/$pkg_name" ]; then
          cp -r "$pkg_path" "$STANDALONE_NM/$scope_name/$pkg_name"
        fi
      fi
    fi
  done
  # Remove .pnpm virtual store (no longer needed after hoisting)
  rm -rf "$PNPM_STORE"
  echo "Hoisted pnpm nested packages to top-level node_modules"
fi

# Remove unnecessary files to reduce package size
# - @img/sharp-libvips-* native binaries (~15MB each, not needed for the server)
rm -rf "$STANDALONE_NM/@img/sharp-libvips-"* 2>/dev/null || true
# - caniuse-lite data (~2.4MB, only needed at build time)
rm -rf "$STANDALONE_NM/caniuse-lite" 2>/dev/null || true
# - next/dist/compiled/webpack (not needed at runtime for standalone)
rm -rf "$STANDALONE_NM/next/dist/compiled/webpack" 2>/dev/null || true

echo "Package size: $(du -sh ./dist | cut -f1)"

# Copy CLI entry point into dist/
cp bin/index.js ./dist/index.js
