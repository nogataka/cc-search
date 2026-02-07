#!/usr/bin/env bash

set -euxo pipefail

if [ -d "dist" ]; then
  rm -rf dist
fi

pnpm exec next build

# Copy standalone output into dist/
cp -r .next/standalone ./dist/

# Copy static assets into the standalone .next directory
cp -r .next/static ./dist/.next/

# Copy public directory if it exists
if [ -d "public" ]; then
  cp -r public ./dist/
fi
