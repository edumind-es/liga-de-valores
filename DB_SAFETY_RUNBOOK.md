# DB Safety Runbook (No‑Coder Friendly)

**Objetivo:** evitar pérdida de datos y errores destructivos en bases de datos.

---

## 1. Reglas de oro
1. Nunca ejecutes scripts si no sabes a qué base apuntan.
2. No ejecutes restores sin un backup reciente confirmado.
3. Tests siempre en base de test o SQLite en memoria.

---

## 2. Cómo saber a qué BD estás apuntando
La app y los scripts usan `DATABASE_URL` (definida en `.env` o en `DATABASE_URL_FILE`).

* Si no hay `DATABASE_URL`, los tests usan SQLite en memoria.
* Los scripts de mantenimiento ahora bloquean producción si `PROD_DB_HOSTS` contiene el host y no has puesto `ALLOW_PROD_DB=1`.

Config recomendada en `.env`:
```
PROD_DB_HOSTS=mi-db-prod,10.0.0.10,db-prod
ALLOW_PROD_DB=0
```

---

## 3. Usuario limitado (recomendado)
Crear un usuario con permisos mínimos evita que un error borre tablas o datos.

Script plantilla:
```
backend/scripts/create_limited_user.sql
```

Notas:
* Rellena `ROLE_NAME`, `PASSWORD` y `DATABASE_NAME`.
* No incluye permisos de `DROP` ni `CREATE` fuera del esquema.

---

## 4. Backups
Script principal:
```
/var/www/liga_edumind/scripts/backup-db.sh
```

Qué hace:
* Exporta la BD del contenedor.
* Comprime y verifica integridad.
* Sube a Hetzner si `rclone` está disponible.
* Borra backups antiguos.

Verificación rápida:
* Revisa `backups/backup.log`.

---

## 5. Restore (solo emergencias)
Script:
```
/var/www/liga_edumind/scripts/restore-db.sh <backup.sql.gz>
```

Medidas de seguridad:
* Te exige confirmación.
* Crea un “safety backup” antes de restaurar.

---

## 6. Tests sin riesgo
Opción segura (recomendada):
```
export DATABASE_URL="sqlite+aiosqlite:///:memory:"
pytest -q
```

Si necesitas una BD de test real:
```
export DATABASE_URL="postgresql+asyncpg://USER:PASSWORD@HOST:PORT/DB_TEST"
export PYTEST_ALLOW_REAL_DB=1
pytest -q
```

---

## 7. Scripts protegidos
Los siguientes scripts tienen guardas para no tocar producción por error:
* `backend/check_db.py`
* `backend/check_proposals.py`
* `backend/check_status.py`
* `backend/check_team.py`
* `backend/check_teams.py`
* `backend/get_match_id.py`
* `backend/setup_audit.py`
* `backend/verify_4_teams.py`
* `backend/verify_calendar_algo.py`
* `backend/scripts/update_sport_categories.py`
* `backend/scripts/update_tipos_deporte_schema.py`
* `backend/scripts/update_ligas_schema.py`
* `backend/scripts/add_crossminton.py`
* `backend/scripts/create_submissions_table.py`
* `backend/create_proposals_table.py`

---

## 8. Señal de alarma
Si ves estos errores, para y revisa:
* “Refusing to run tests with a non‑test DATABASE_URL”
* “Bloqueado por seguridad. La base coincide con PROD_DB_HOSTS”
* “DATABASE_URL no está configurada”

---

## 9. Política recomendada
1. Backups diarios automáticos.
2. Restore de prueba semanal en una BD de test.
3. Ningún agente IA con permisos para ejecutar restores.
4. Los scripts críticos deben pasar por revisión humana.
