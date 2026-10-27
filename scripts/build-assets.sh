#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASEPRITE="${ASEPRITE:-${HOME}/.local/bin/aseprite}"
if ! [ -x "$ASEPRITE" ]; then
  ASEPRITE="$(command -v aseprite || true)"
fi
if [ -z "$ASEPRITE" ]; then
  echo 'Run npm run install:aseprite first.' >&2
  exit 1
fi
mkdir -p "$ROOT/public/assets" "$ROOT/art/source"
node "$ROOT/scripts/export-world.mjs"
"$ASEPRITE" --batch --script-param "root=$ROOT" --script "$ROOT/art/build.lua"
