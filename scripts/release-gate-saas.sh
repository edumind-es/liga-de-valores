#!/usr/bin/env bash
set -Eeuo pipefail

# SaaS release gate for Liga EDUmind (production Docker runtime).
# Usage:
#   bash /var/www/liga_edumind/scripts/release-gate-saas.sh
#
# Optional env vars:
#   MATCH_ID=425
#   LOG_WINDOW_MINUTES=20
#   RUN_PYTEST=0

ROOT_DIR="/var/www/liga_edumind"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
BACKEND_CONTAINER="liga-edumind-backend-prod"
DB_CONTAINER="liga-edumind-db-prod"
REDIS_CONTAINER="liga-edumind-redis-prod"

MATCH_ID="${MATCH_ID:-425}"
LOG_WINDOW_MINUTES="${LOG_WINDOW_MINUTES:-20}"
RUN_PYTEST="${RUN_PYTEST:-0}"

timestamp() {
  date -u "+%Y-%m-%d %H:%M:%S UTC"
}

step() {
  echo
  echo "==> $1"
}

ok() {
  echo "[OK] $1"
}

die() {
  echo "[FAIL] $1" >&2
  exit 1
}

step "Release gate started at $(timestamp)"
echo "ROOT_DIR=${ROOT_DIR}"
echo "MATCH_ID=${MATCH_ID}"
echo "LOG_WINDOW_MINUTES=${LOG_WINDOW_MINUTES}"
echo "RUN_PYTEST=${RUN_PYTEST}"

step "Container health"
compose_ps="$(docker compose -f "${COMPOSE_FILE}" ps)"
echo "${compose_ps}"

echo "${compose_ps}" | rg -q "backend.*healthy" || die "Backend container is not healthy"
echo "${compose_ps}" | rg -q "db.*healthy" || die "Database container is not healthy"
echo "${compose_ps}" | rg -q "redis.*healthy|redis.*Up" || die "Redis container is not healthy"
ok "Docker services healthy"

step "API liveness and readiness endpoints"
live_status="$(docker exec "${BACKEND_CONTAINER}" python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8001/api/live', timeout=5).status)")"
[[ "${live_status}" == "200" ]] || die "Liveness endpoint returned ${live_status}"
ready_status="$(docker exec "${BACKEND_CONTAINER}" python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8001/api/ready', timeout=5).status)")"
[[ "${ready_status}" == "200" ]] || die "Readiness endpoint returned ${ready_status}"
ok "Liveness and readiness endpoints return 200"

step "DB and Redis checks"
db_ping="$(docker exec "${DB_CONTAINER}" psql -U liga_edumind -d liga_edumind -tAc "SELECT 1;")"
[[ "${db_ping}" == "1" ]] || die "DB ping failed: '${db_ping}'"
redis_ping="$(docker exec "${REDIS_CONTAINER}" redis-cli ping | tr -d '\r')"
[[ "${redis_ping}" == "PONG" ]] || die "Redis ping failed: '${redis_ping}'"
ok "DB and Redis reachable"

step "Critical endpoint smoke (/api/v1/partidos/${MATCH_ID})"
partido_status="$(docker exec "${BACKEND_CONTAINER}" python -c "
import urllib.request, urllib.error
try:
    r = urllib.request.urlopen('http://127.0.0.1:8001/api/v1/partidos/${MATCH_ID}', timeout=5)
    print(r.status)
except urllib.error.HTTPError as e:
    print(e.code)
")"
# 200 = accesible; 401 = requiere auth (endpoint existe, backend enruta OK); 404 = no encontrado (normal)
[[ "${partido_status}" == "200" || "${partido_status}" == "401" || "${partido_status}" == "404" ]] \
  || die "Critical partido endpoint returned unexpected status ${partido_status} (esperado 200/401/404)"
ok "Critical partido endpoint returns ${partido_status} (routing OK)"

step "Auth flow smoke (register/login/me/ligas)"
docker exec "${BACKEND_CONTAINER}" python -c "
import json, time, urllib.request

base = 'http://127.0.0.1:8001/api/v1'
code = 'gate_' + str(int(time.time()))
pwd = 'Gate#2026!'
email = code + '@example.com'

def req(p, m='GET', d=None, t=None):
    h = {}
    if d is not None: h['Content-Type'] = 'application/json'
    if t: h['Authorization'] = 'Bearer ' + t
    return urllib.request.Request(base+p, data=(json.dumps(d).encode() if d is not None else None), method=m, headers=h)

r = urllib.request.urlopen(req('/auth/register','POST',{'codigo':code,'email':email,'password':pwd,'acepta_privacidad':True}), timeout=8)
assert r.status == 201, f'Register failed: {r.status}'
l = urllib.request.urlopen(req('/auth/login','POST',{'codigo':code,'password':pwd}), timeout=8)
assert l.status == 200, f'Login failed: {l.status}'
token = json.loads(l.read().decode())['access_token']
m = urllib.request.urlopen(req('/auth/me','GET',None,token), timeout=8)
assert m.status == 200, f'Me failed: {m.status}'
g = urllib.request.urlopen(req('/ligas/','GET',None,token), timeout=8)
assert g.status == 200, f'Ligas failed: {g.status}'
print('auth_flow=ok codigo=' + code)
"
ok "Auth flow smoke passed"

step "Frontend artifacts"
[[ -s "${ROOT_DIR}/frontend/dist/index.html" ]] || die "Missing frontend/dist/index.html"
[[ -s "${ROOT_DIR}/frontend/dist/sw.js" ]] || die "Missing frontend/dist/sw.js"
[[ -s "${ROOT_DIR}/frontend/dist/manifest.json" ]] || die "Missing frontend/dist/manifest.json"
compgen -G "${ROOT_DIR}/frontend/dist/assets/index-*.js" > /dev/null || die "Missing frontend/dist/assets/index-*.js"
ok "Frontend dist artifacts present"

step "Contract audit"
./backend/venv/bin/python "${ROOT_DIR}/scripts/route-contract-audit.py" --format summary --strict
ok "Route contract audit passed"

step "Frontend runtime safety checks"
(cd "${ROOT_DIR}/frontend" && npx eslint src/pages/Partidos/ListaPartidos.tsx src/pages/Partidos/VerPartido.tsx src/hooks/useOfflineSync.ts)
ok "Frontend critical files lint passed"

step "Critical log scan (last ${LOG_WINDOW_MINUTES} minutes)"
log_tmp="$(mktemp)"
docker logs --since "${LOG_WINDOW_MINUTES}m" "${BACKEND_CONTAINER}" > "${log_tmp}" 2>&1 || true
if rg -n "(MissingGreenlet|Traceback|Exception in ASGI application|HTTP/1.1\" 500)" "${log_tmp}" >/tmp/release_gate_log_hits.txt; then
  echo "Critical patterns found in backend logs:"
  cat /tmp/release_gate_log_hits.txt
  rm -f "${log_tmp}" /tmp/release_gate_log_hits.txt
  die "Critical backend log patterns detected"
fi
rm -f "${log_tmp}" /tmp/release_gate_log_hits.txt
ok "No critical log patterns detected"

step "Targeted python syntax checks"
cd "${ROOT_DIR}/backend"
./venv/bin/python -m py_compile app/api/v1/partidos.py app/services/clasificacion_service.py app/tests/test_partidos.py
ok "Python files compile"

step "Migration safety and topology checks"
./venv/bin/python scripts/check_safe_migrations.py
heads_output="$(./venv/bin/alembic heads)"
echo "${heads_output}"
head_count="$(echo "${heads_output}" | rg -c "\\(head\\)")"
[[ "${head_count}" -eq 1 ]] || die "Expected exactly 1 Alembic head, found ${head_count}"
ok "Alembic migrations are safe and single-head"

if [[ "${RUN_PYTEST}" == "1" ]]; then
  step "Targeted pytest checks"
  timeout 240 ./venv/bin/python -m pytest app/tests/test_partidos.py -k "read_partido_refresh" -q
  ok "Targeted pytest passed"
fi

step "Release gate finished successfully at $(timestamp)"
echo "GO/NO-GO: GO"
