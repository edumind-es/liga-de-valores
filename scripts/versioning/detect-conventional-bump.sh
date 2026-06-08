#!/usr/bin/env bash
set -Eeuo pipefail

FROM_REF="${1:-}"
TO_REF="${2:-HEAD}"

if [[ -z "${FROM_REF}" ]]; then
  LAST_TAG="$(git describe --tags --match 'v[0-9]*' --abbrev=0 2>/dev/null || true)"
  if [[ -n "${LAST_TAG}" ]]; then
    FROM_REF="${LAST_TAG}"
  else
    FROM_REF="$(git rev-list --max-parents=0 HEAD | tail -n 1)"
  fi
fi

RANGE="${FROM_REF}..${TO_REF}"
SUBJECTS="$(git log --format='%s' "${RANGE}" 2>/dev/null || true)"
BODIES="$(git log --format='%b' "${RANGE}" 2>/dev/null || true)"

# No commits in range -> keep moving with patch to avoid stale private versions.
if [[ -z "${SUBJECTS}" && -z "${BODIES}" ]]; then
  echo "patch"
  exit 0
fi

# BREAKING CHANGE in body or "type(scope)!:" in subject -> major.
if printf '%s\n' "${SUBJECTS}" | grep -Eq '^[a-z]+(\([^)]+\))?!:'; then
  echo "major"
  exit 0
fi
if printf '%s\n' "${BODIES}" | grep -Eqi 'BREAKING CHANGE:'; then
  echo "major"
  exit 0
fi

# Conventional feature -> minor.
if printf '%s\n' "${SUBJECTS}" | grep -Eq '^feat(\([^)]+\))?:'; then
  echo "minor"
  exit 0
fi

# Fix/perf/refactor/revert -> patch.
if printf '%s\n' "${SUBJECTS}" | grep -Eq '^(fix|perf|refactor|revert)(\([^)]+\))?:'; then
  echo "patch"
  exit 0
fi

# Default conservative bump.
echo "patch"
