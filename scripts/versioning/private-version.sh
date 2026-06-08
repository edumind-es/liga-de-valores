#!/usr/bin/env bash
set -Eeuo pipefail

PUBLIC_VERSION="${1:?Usage: private-version.sh <public-version> <git-sha> [run-number]}"
GIT_SHA="${2:?Usage: private-version.sh <public-version> <git-sha> [run-number]}"
RUN_NUMBER="${3:-0}"

if ! [[ "${PUBLIC_VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Invalid public semver: ${PUBLIC_VERSION}" >&2
  exit 1
fi

TIMESTAMP="$(date -u +%Y%m%d%H%M%S)"
SHORT_SHA="$(printf '%s' "${GIT_SHA}" | cut -c1-7)"

echo "${PUBLIC_VERSION}-private.${TIMESTAMP}.r${RUN_NUMBER}+${SHORT_SHA}"
