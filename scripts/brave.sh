#!/usr/bin/env bash
# Load the production build in a dedicated Brave profile.
# The finished extension does not need this script, Bun, or a dev server.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
extension="$root/dist/chrome-mv3"
profile="${NODO_BRAVE_PROFILE:-$root/.brave-profile}"
brave="${BRAVE_BIN:-brave-browser}"

if [[ ! -f "$extension/manifest.json" ]]; then
  echo "dist/chrome-mv3 がありません。先に bun run build を実行してください。" >&2
  exit 1
fi

if ! command -v "$brave" >/dev/null 2>&1; then
  echo "Brave が見つかりません。BRAVE_BIN に実行ファイルのパスを指定してください。" >&2
  exit 1
fi

exec "$brave" \
  --user-data-dir="$profile" \
  --no-first-run \
  --no-default-browser-check \
  --disable-extensions-except="$extension" \
  --load-extension="$extension" \
  "$@"
