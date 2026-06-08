#!/usr/bin/env bash
set -euo pipefail

DIST_DIR="${1:-dist}"
ASSETS_DIR="${DIST_DIR}/assets"
INDEX_HTML="${DIST_DIR}/index.html"
PREVIOUS_ASSETS_FILE=".cache/previous-assets.txt"

if [[ ! -f "${INDEX_HTML}" || ! -d "${ASSETS_DIR}" ]]; then
  echo "No se encontraron ${INDEX_HTML} o ${ASSETS_DIR}. Omitiendo aliases."
  exit 0
fi

main_js="$(sed -n 's|.*src="/assets/\(index-[^"]*\.js\)".*|\1|p' "${INDEX_HTML}" | head -n 1)"
main_css="$(sed -n 's|.*href="/assets/\(index-[^"]*\.css\)".*|\1|p' "${INDEX_HTML}" | head -n 1)"

if [[ -z "${main_js}" || -z "${main_css}" ]]; then
  echo "No se detectaron bundles principales en ${INDEX_HTML}. Omitiendo aliases."
  exit 0
fi

copy_alias_if_needed() {
  local source_file="$1"
  local target_file="$2"

  if [[ -z "${source_file}" || -z "${target_file}" ]]; then
    return 0
  fi

  if [[ ! -f "${source_file}" ]]; then
    return 0
  fi

  # Avoid noisy "same file" copy attempts.
  if [[ "$(basename "${source_file}")" == "$(basename "${target_file}")" ]]; then
    return 0
  fi

  cp -f "${source_file}" "${target_file}"
}

js_aliases=(
  "index-DiIvtB2x.js"
  "index-DNWoCgZc.js"
  "index-BYY1NK8H.js"
  "index-DQibjSDO.js"
  "index-CDTOoVD9.js"
)

css_aliases=(
  "index-CZCDPeiL.css"
)

for alias in "${js_aliases[@]}"; do
  copy_alias_if_needed "${ASSETS_DIR}/${main_js}" "${ASSETS_DIR}/${alias}"
done

for alias in "${css_aliases[@]}"; do
  copy_alias_if_needed "${ASSETS_DIR}/${main_css}" "${ASSETS_DIR}/${alias}"
done

# Auto-alias assets from the previous build to current filenames by prefix.
# This prevents transient 404s for users who still run an older app shell.
if [[ -f "${PREVIOUS_ASSETS_FILE}" ]]; then
  while IFS= read -r previous_asset; do
    [[ -z "${previous_asset}" ]] && continue

    # Expected pattern: <prefix>-<hash>.<ext>
    if [[ "${previous_asset}" =~ ^(.+)-[A-Za-z0-9_-]+(\.(js|css))$ ]]; then
      prefix="${BASH_REMATCH[1]}"
      ext="${BASH_REMATCH[2]}"
      current_file="$(ls -1 "${ASSETS_DIR}/${prefix}"-*"${ext}" 2>/dev/null | head -n 1 || true)"
      if [[ -n "${current_file}" ]]; then
        if [[ "$(basename "${current_file}")" == "${previous_asset}" ]]; then
          continue
        fi
        copy_alias_if_needed "${current_file}" "${ASSETS_DIR}/${previous_asset}"
      fi
    fi
  done < "${PREVIOUS_ASSETS_FILE}"
fi

# Backward compatibility for stale route chunks loaded by older app shells.
# Format: "<legacy-filename>:<current-prefix>"
legacy_chunk_aliases=(
  "equipos-tc69Lv-o.js:equipos-"
  "criterios-ONN7oHzL.js:criterios-"
  "copy-CADx5U5s.js:copy-"
  "arrow-left-Br5mwl_h.js:arrow-left-"
  "VerLiga-C6l6_QjX.js:VerLiga-"
  "VerLiga-CI6_QjX.js:VerLiga-"
)

for mapping in "${legacy_chunk_aliases[@]}"; do
  legacy_file="${mapping%%:*}"
  prefix="${mapping##*:}"
  current_file="$(ls -1 "${ASSETS_DIR}/${prefix}"*.js 2>/dev/null | head -n 1 || true)"
  if [[ -n "${current_file}" ]]; then
    copy_alias_if_needed "${current_file}" "${ASSETS_DIR}/${legacy_file}"
  fi
done

echo "Aliases legacy actualizados en ${ASSETS_DIR}"
