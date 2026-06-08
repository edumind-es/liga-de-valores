#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

ok() { echo "[OK] $1"; }
warn() { echo "[WARN] $1"; }
err() { echo "[ERROR] $1"; }

echo "==> Liga EDUmind mobile preflight"
echo "ROOT_DIR=${ROOT_DIR}"

if command -v node >/dev/null 2>&1; then
  ok "Node: $(node --version)"
else
  err "Node no está instalado"
  exit 1
fi

if command -v npm >/dev/null 2>&1; then
  ok "npm: $(npm --version)"
else
  err "npm no está instalado"
  exit 1
fi

if [[ -f capacitor.config.ts ]]; then
  ok "capacitor.config.ts detectado"
else
  err "Falta capacitor.config.ts"
  exit 1
fi

if command -v npx >/dev/null 2>&1; then
  npx cap --version >/tmp/liga-cap-version.txt 2>/tmp/liga-cap-version.err || true
  if [[ -s /tmp/liga-cap-version.txt ]]; then
    ok "Capacitor CLI: $(cat /tmp/liga-cap-version.txt | tr -d '\n')"
  else
    warn "No se pudo ejecutar 'npx cap --version'"
    cat /tmp/liga-cap-version.err || true
  fi
else
  err "npx no está disponible"
  exit 1
fi

if [[ "$(uname -s)" == "Darwin" ]]; then
  if command -v xcodebuild >/dev/null 2>&1; then
    ok "Xcode: $(xcodebuild -version | tr '\n' ' ' | sed 's/  */ /g')"
  else
    warn "xcodebuild no disponible. Instala Xcode desde App Store"
  fi

  if command -v pod >/dev/null 2>&1; then
    ok "CocoaPods: $(pod --version)"
  else
    warn "CocoaPods no instalado. Recomendado: 'sudo gem install cocoapods'"
  fi

  if command -v security >/dev/null 2>&1; then
    if security find-identity -v -p codesigning >/tmp/liga-codesign.txt 2>/tmp/liga-codesign.err; then
      count="$(grep -E '^[[:space:]]*[0-9]+\)' /tmp/liga-codesign.txt | wc -l | tr -d ' ')"
      if [[ "${count}" -gt 0 ]]; then
        ok "Identidades de firma detectadas: ${count}"
      else
        warn "No hay identidades de firma en keychain"
      fi
    else
      warn "No se pudieron listar identidades de firma"
      cat /tmp/liga-codesign.err || true
    fi
  fi
else
  warn "No estás en macOS. El build iOS/TestFlight solo se puede cerrar en Mac con Xcode."
fi

echo "==> Checks mínimos de archivos de asociación"
if [[ -f public/.well-known/apple-app-site-association ]]; then
  ok "apple-app-site-association presente"
else
  warn "Falta public/.well-known/apple-app-site-association"
fi

if [[ -f public/.well-known/assetlinks.json ]]; then
  ok "assetlinks.json presente"
else
  warn "Falta public/.well-known/assetlinks.json"
fi

echo "==> Preflight completado"
