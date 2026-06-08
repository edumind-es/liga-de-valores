#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist"
CACHE_DIR="${ROOT_DIR}/.cache"
OUTPUT_FILE="${CACHE_DIR}/previous-assets.txt"

mkdir -p "${CACHE_DIR}"
: > "${OUTPUT_FILE}"

if [[ ! -d "${DIST_DIR}/assets" ]]; then
  exit 0
fi

# Prefer parsing the current service worker precache to capture only real build assets
# (aliases injected postbuild are not listed in sw.js).
if [[ -f "${DIST_DIR}/sw.js" ]]; then
  if command -v rg >/dev/null 2>&1; then
    rg -o "assets/[A-Za-z0-9._-]+\\.(js|css)" "${DIST_DIR}/sw.js" \
      | sed 's#^assets/##' \
      | sort -u > "${OUTPUT_FILE}" || true
  else
    grep -Eo "assets/[A-Za-z0-9._-]+\\.(js|css)" "${DIST_DIR}/sw.js" \
      | sed 's#^assets/##' \
      | sort -u > "${OUTPUT_FILE}" || true
  fi
fi

# Fallback to all assets if parsing sw.js did not produce entries.
if [[ ! -s "${OUTPUT_FILE}" ]]; then
  ls -1 "${DIST_DIR}/assets"/*.js "${DIST_DIR}/assets"/*.css 2>/dev/null \
    | xargs -n 1 basename \
    | sort -u > "${OUTPUT_FILE}" || true
fi

exit 0
