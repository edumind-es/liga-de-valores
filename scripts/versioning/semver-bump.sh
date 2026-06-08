#!/usr/bin/env bash
set -Eeuo pipefail

BASE_VERSION="${1:?Usage: semver-bump.sh <base-version> <major|minor|patch|none>}"
BUMP_TYPE="${2:?Usage: semver-bump.sh <base-version> <major|minor|patch|none>}"

if ! [[ "${BASE_VERSION}" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
  echo "Invalid semver: ${BASE_VERSION}" >&2
  exit 1
fi

MAJOR="${BASH_REMATCH[1]}"
MINOR="${BASH_REMATCH[2]}"
PATCH="${BASH_REMATCH[3]}"

case "${BUMP_TYPE}" in
  major)
    MAJOR="$((MAJOR + 1))"
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR="$((MINOR + 1))"
    PATCH=0
    ;;
  patch)
    PATCH="$((PATCH + 1))"
    ;;
  none)
    ;;
  *)
    echo "Unsupported bump type: ${BUMP_TYPE}" >&2
    exit 1
    ;;
esac

echo "${MAJOR}.${MINOR}.${PATCH}"
