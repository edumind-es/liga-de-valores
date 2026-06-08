# Arquitectura Tecnica Roles de Partido Escalable - Liga EDUmind
Fecha: 2026-02-22  
Estado: Propuesta de diseno (sin implementacion)  
Autor: Lead Backend & Frontend Senior (plan de escalado sin regresiones)

## 1. Objetivo
Definir una arquitectura escalable para que cada docente pueda configurar de forma selectiva los roles de partido que afectan a puntuacion, incluyendo sustituciones predefinidas (ej. `grada_visitante -> staff_tecnico`), garantizando:

1. Consistencia estructural por liga.
2. Base de datos manejable.
3. Cero cambios destructivos en funcionalidad actual.
4. Sin edicion de roles por jornada/partido una vez activada la liga.

## 2. Alcance y no alcance
### 2.1 Alcance
1. Diseno de modelo de dominio para roles de partido (3/4/5 slots).
2. Reglas de bloqueo por liga (creacion y activacion).
3. Contrato API objetivo.
4. Estrategia de migracion sin downtime.
5. Plan de validacion tecnica y operativa.

### 2.2 No alcance
1. Implementacion de codigo.
2. Refactor visual completo de pantallas (solo especificacion funcional UX).
3. Cambio de scoring historico de ligas ya cerradas.

## 3. Estado actual auditado (AS-IS)
### 3.1 Hallazgos existentes
1. Ya existe soporte parcial de roles pedagogicos en liga:
   - `team_roles` y `team_commitments` en `backend/app/models/liga.py`.
   - Migracion: `backend/alembic/versions/72a20bb2d4f9_add_team_portal_fields.py`.
2. Ya existe UI parcial docente para editar roles/compromisos:
   - `frontend/src/pages/Ligas/ConfiguracionLiga.tsx`.
3. Ya existe portal publico de equipo que consume roles:
   - API: `backend/app/api/v1/team_access.py`.
   - UI: `frontend/src/pages/Public/PublicTeamPortal.tsx`.

### 3.2 Brecha funcional real
1. Los roles actuales son pedagogicos (portal de equipo), no gobiernan la arquitectura de partido.
2. El partido sigue acoplado a campos fijos (`arbitro`, `grada_local`, `grada_visitante`).
3. No existe hoy contrato robusto para persistir y versionar esquema de roles de partido por liga.
4. No existe regla formal de bloqueo por liga para impedir cambios estructurales tras iniciar competicion.

## 4. Principios de arquitectura
1. Separar claramente:
   - Roles pedagogicos de equipo (portal, compromisos, contratos).
   - Roles operativos de partido (slots evaluables y puntuables).
2. El partido usa slots estables, no texto libre.
3. La liga define esquema una vez y lo bloquea al activar competicion.
4. Versionar esquema por liga para trazabilidad.
5. Compatibilidad hacia atras obligatoria con ligas existentes.

## 5. Modelo de dominio objetivo (TO-BE)
## 5.1 Entidades nuevas (scoring de partido)
### `league_match_role_schema`
1. `id` (PK)
2. `liga_id` (FK -> ligas.id, index)
3. `version` (int, default 1)
4. `roles_per_match` (smallint, CHECK 3..5)
5. `status` (`draft|locked|deprecated`)
6. `locked_at` (timestamptz, nullable)
7. `created_at`, `updated_at`
8. Restriccion: unica fila `status=locked` por liga.

### `league_match_role_slot`
1. `id` (PK)
2. `schema_id` (FK -> league_match_role_schema.id, index)
3. `slot_key` (`home_team|away_team|slot_3|slot_4|slot_5`)
4. `slot_order` (1..5)
5. `role_code` (slug canonical, ej. `staff_tecnico`)
6. `role_label` (texto docente, ej. `Staff Tecnico`)
7. `scoring_category` (`competitive|arbitraje|grada|staff|custom`)
8. `is_required` (bool)
9. `evaluation_enabled` (bool)
10. Restricciones:
    - Unico `(schema_id, slot_key)`
    - Unico `(schema_id, slot_order)`
    - `home_team` y `away_team` siempre presentes

### `league_match_role_rule`
1. `id` (PK)
2. `schema_id` (FK)
3. `role_code`
4. `rule_code` (ej. `positive_points_if_avg_ge_5`)
5. `params_json` (JSONB)

Nota: Reglas en tabla separada permite escalar scoring sin tocar columnas de partido.

## 5.2 Entidades existentes (se mantienen)
1. `ligas.team_roles` y `ligas.team_commitments` permanecen para capa pedagogica.
2. `partidos` mantiene columnas actuales durante fase de compatibilidad.

## 6. Reglas de negocio obligatorias
1. El esquema de roles de partido se configura en estado `draft`.
2. Se bloquea automaticamente al primer evento estructural:
   - Generacion de jornadas, o
   - Creacion del primer partido, o
   - Registro de primera evaluacion.
3. Tras bloqueo:
   - No se permite alterar `roles_per_match`.
   - No se permite sustituir slots.
   - Solo ajustes no estructurales (copy/etiqueta visible) si no afectan scoring.
4. No se permite configuracion por jornada/partido.
5. Si el docente necesita cambio estructural:
   - Flujo oficial: clonar liga/temporada y regenerar calendario.

## 7. Sistema de sustitucion de roles (predefinidos)
## 7.1 Definicion
Sustitucion = mapear un `slot_key` auxiliar a otro `role_code` sin alterar `home_team` y `away_team`.

## 7.2 Ejemplo pedido
1. Plantilla 5 roles:
   - `home_team`
   - `away_team`
   - `arbitro`
   - `grada_local`
   - `grada_visitante`
2. Sustitucion valida:
   - `slot_5 (grada_visitante) -> staff_tecnico`

## 7.3 Restricciones de sustitucion
1. Solo en `draft`.
2. Solo slots auxiliares (`slot_3..slot_5`).
3. Debe existir regla de scoring para el nuevo `role_code`.
4. Debe cumplirse `roles_per_match` y cardinalidad de equipos disponibles.

## 8. Matriz de formatos 3/4/5 roles por partido
### Formato 3 roles
1. `home_team`
2. `away_team`
3. `slot_3` (ej. `arbitro` o `staff_tecnico`)
Regla de viabilidad: minimo 3 equipos.

### Formato 4 roles
1. `home_team`
2. `away_team`
3. `slot_3`
4. `slot_4`
Regla de viabilidad: minimo 4 equipos.

### Formato 5 roles
1. `home_team`
2. `away_team`
3. `slot_3`
4. `slot_4`
5. `slot_5`
Regla de viabilidad: minimo 5 equipos.

## 9. Contrato API objetivo (diseño)
## 9.1 Creacion de liga
`POST /api/v1/ligas`

Campos nuevos propuestos:
1. `match_role_schema` (objeto opcional)
2. `match_role_schema.roles_per_match` (3|4|5)
3. `match_role_schema.slots[]` (slot_key, role_code, role_label, scoring_category)
4. `match_role_schema.rules[]`

## 9.2 Lectura de esquema
`GET /api/v1/ligas/{liga_id}/match-role-schema`

Respuesta:
1. `schema_id`
2. `status`
3. `roles_per_match`
4. `slots[]`
5. `rules[]`
6. `locked_at`

## 9.3 Actualizacion de esquema
`PUT /api/v1/ligas/{liga_id}/match-role-schema`

Condicion:
1. Solo permitido con `status=draft`.

Errores:
1. `409 schema_locked`
2. `422 invalid_slot_substitution`
3. `422 invalid_roles_per_match`

## 9.4 Bloqueo explicito
`POST /api/v1/ligas/{liga_id}/match-role-schema/lock`

Uso:
1. Permite bloqueo manual previo a generar jornadas.

## 9.5 Ejemplos de payload (canonicos)
### `POST /api/v1/ligas` (nueva liga con 5 roles y sustitucion)
```json
{
  "nombre": "Liga 6A 2026-2027",
  "temporada": "2026-2027",
  "modo_competicion": "unico_deporte",
  "modo_evaluacion": "clasico",
  "match_role_schema": {
    "roles_per_match": 5,
    "slots": [
      { "slot_key": "home_team", "slot_order": 1, "role_code": "equipo_local", "role_label": "Equipo local", "scoring_category": "competitive", "is_required": true, "evaluation_enabled": true },
      { "slot_key": "away_team", "slot_order": 2, "role_code": "equipo_visitante", "role_label": "Equipo visitante", "scoring_category": "competitive", "is_required": true, "evaluation_enabled": true },
      { "slot_key": "slot_3", "slot_order": 3, "role_code": "arbitro", "role_label": "Arbitro", "scoring_category": "arbitraje", "is_required": true, "evaluation_enabled": true },
      { "slot_key": "slot_4", "slot_order": 4, "role_code": "grada_local", "role_label": "Tutor de grada local", "scoring_category": "grada", "is_required": true, "evaluation_enabled": true },
      { "slot_key": "slot_5", "slot_order": 5, "role_code": "staff_tecnico", "role_label": "Staff Tecnico", "scoring_category": "staff", "is_required": true, "evaluation_enabled": true }
    ],
    "rules": [
      { "role_code": "arbitro", "rule_code": "positive_points_if_avg_ge_5", "params_json": { "points": 2 } },
      { "role_code": "staff_tecnico", "rule_code": "fixed_points_if_submitted", "params_json": { "points": 1 } }
    ]
  }
}
```

### `PUT /api/v1/ligas/{liga_id}/match-role-schema` (sustitucion en draft)
```json
{
  "roles_per_match": 5,
  "slots": [
    { "slot_key": "home_team", "slot_order": 1, "role_code": "equipo_local" },
    { "slot_key": "away_team", "slot_order": 2, "role_code": "equipo_visitante" },
    { "slot_key": "slot_3", "slot_order": 3, "role_code": "arbitro" },
    { "slot_key": "slot_4", "slot_order": 4, "role_code": "grada_local" },
    { "slot_key": "slot_5", "slot_order": 5, "role_code": "staff_tecnico" }
  ]
}
```

## 10. Ajuste de motor de calendario y partido
1. El generador de jornadas debe leer `roles_per_match` y slots activos del schema bloqueado.
2. Asignacion de equipos en slots auxiliares con rotacion equitativa.
3. Validar invariantes por partido:
   - Un equipo no puede ocupar 2 slots en el mismo partido.
   - Siempre existen `home_team` y `away_team`.
4. Persistencia de asignaciones de slots por partido en estructura versionada (tabla o JSONB derivado).

## 10.1 Invariantes de ejecucion por partido (hard checks)
1. `roles_per_match` del partido == `roles_per_match` del schema bloqueado de la liga.
2. No repetir `equipo_id` dentro del mismo partido para distintos `slot_key`.
3. Slots obligatorios presentes segun schema.
4. No aceptar evaluacion en `role_code` no habilitado (`evaluation_enabled=false`).
5. Si el partido pertenece a liga con schema bloqueado, no aceptar payload legacy de roles fijos sin traduccion.

## 11. Estrategia de compatibilidad y migracion (sin caida)
## 11.1 Fase A - Expand (backward compatible)
1. Crear tablas nuevas de schema de roles.
2. No retirar columnas actuales de `partidos`.
3. Crear esquema `legacy_5` para ligas existentes.

## 11.2 Fase B - Dual read / dual write
1. Lectura:
   - Si existe schema bloqueado -> motor v2.
   - Si no existe -> comportamiento legacy.
2. Escritura:
   - Nuevas ligas con schema v2.
   - Legacy sigue sin cambios.

## 11.3 Fase C - Consolidacion
1. Migrar gradualmente ligas voluntarias.
2. Mantener proyecciones legacy para reportes.
3. Dejar columnas antiguas como compatibilidad de lectura hasta version mayor.

## 11.4 Secuencia de despliegue sin downtime (orden estricto)
1. Deploy backend con tablas y lecturas compatibles (sin usar rutas nuevas por defecto).
2. Ejecutar migraciones expand.
3. Activar feature flag `MATCH_ROLE_SCHEMA_V2_CREATE=false`.
4. Verificar smoke legacy.
5. Activar `MATCH_ROLE_SCHEMA_V2_CREATE=true` solo para cohortes privadas.
6. Monitorear 24h logs de `schema_locked`, `invalid_slot_substitution`, `calendar_assignment_error`.
7. Ampliar cohortes progresivamente.

## 12. UX funcional (sin rediseño visual completo)
1. `CrearLiga`: paso adicional "Formato de partido y roles evaluables".
2. Opciones:
   - Plantillas oficiales 3/4/5.
   - Sustitucion guiada de slots auxiliares (ej. `grada_visitante -> staff_tecnico`).
3. Indicador de estado:
   - `draft` vs `locked`.
4. Mensaje de bloqueo:
   - "Este formato se aplica a toda la liga y no se modifica por jornada/partido."
5. `ConfiguracionLiga`:
   - Mostrar schema bloqueado en modo solo lectura.

## 13. Requisitos de rendimiento y operacion
1. Carga de schema por liga en O(1) con indices por `liga_id`.
2. Cache en memoria de schema bloqueado por liga (TTL corto, invalidacion en lock/update).
3. Sin consultas N+1 en asignacion de slots.
4. Logs estructurados con `liga_id`, `schema_id`, `roles_per_match`, `event`.

## 14. Riesgos y mitigaciones
1. Riesgo: confundir roles pedagogicos y roles puntuables.
   - Mitigacion: separar nomenclatura y endpoints.
2. Riesgo: inconsistencia por cambios tardios.
   - Mitigacion: lock estricto y errores 409.
3. Riesgo: regresion en ligas activas legacy.
   - Mitigacion: ruta legacy intacta + dual read.
4. Riesgo: complejidad de scoring custom.
   - Mitigacion: catalogo acotado de `rule_code` en v1.

## 15. Plan de pruebas (gate de salida)
## 15.1 Backend
1. Tests de validacion de schema (3/4/5, slots obligatorios, sustituciones).
2. Tests de lock y rechazo de edicion en estado bloqueado.
3. Tests de calendario con formatos 3/4/5.
4. Tests de scoring por rol sustituido (`staff_tecnico`).
5. Tests de compatibilidad legacy sin cambios de resultado.

## 15.2 Frontend
1. Flujo completo `CrearLiga` con plantilla y sustitucion.
2. Mensajes y estados `draft/locked`.
3. Verificacion de no edicion tras lock.
4. Responsive y accesibilidad AA en nuevos controles.

## 15.3 Operacion
1. `npm run lint` verde.
2. `npm run build` verde.
3. `release-gate-saas.sh` verde.
4. Smoke de creacion de liga legacy y v2 en paralelo.

## 16. Criterios de aceptacion de arquitectura
1. El docente define roles puntuables por liga (3/4/5) con sustituciones predefinidas.
2. El formato no cambia por jornada/partido tras lock.
3. Ligas existentes continúan operativas sin migracion forzada.
4. La base de datos mantiene trazabilidad y consulta predecible.
5. El plan de rollback es inmediato (desactivar rutas v2 y operar en legacy).

## 17. Decisiones abiertas (para cerrar antes de implementar)
1. Catalogo inicial de `role_code` puntuables oficiales (incluyendo `staff_tecnico`).
2. Conjunto de `rule_code` permitido en v1.
3. Momento exacto de lock automatico (primer partido creado o primera jornada generada).
4. Si se permite "unlock" solo en ligas sin partidos.

## 18. Recomendacion ejecutiva
Implementar en dos iteraciones controladas:
1. Iteracion 1: Schema v2 + lock + APIs + compatibilidad legacy (sin cambios visuales extensos).
2. Iteracion 2: UX docente guiada en `CrearLiga` y `ConfiguracionLiga`, con sustituciones y validaciones pedagogicas.

Esto permite escalar el producto sin comprometer la estabilidad actual.

## 19. Anexo A - DDL objetivo (referencia)
```sql
create table league_match_role_schema (
  id bigserial primary key,
  liga_id bigint not null references ligas(id) on delete cascade,
  version int not null default 1,
  roles_per_match smallint not null check (roles_per_match between 3 and 5),
  status varchar(20) not null check (status in ('draft','locked','deprecated')),
  locked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz null
);
create index ix_lmrs_liga_id on league_match_role_schema(liga_id);

create table league_match_role_slot (
  id bigserial primary key,
  schema_id bigint not null references league_match_role_schema(id) on delete cascade,
  slot_key varchar(20) not null,
  slot_order smallint not null,
  role_code varchar(64) not null,
  role_label varchar(120) not null,
  scoring_category varchar(32) not null,
  is_required boolean not null default true,
  evaluation_enabled boolean not null default true,
  constraint uq_lmrs_slot_key unique (schema_id, slot_key),
  constraint uq_lmrs_slot_order unique (schema_id, slot_order)
);
create index ix_lmrs_schema_id on league_match_role_slot(schema_id);

create table league_match_role_rule (
  id bigserial primary key,
  schema_id bigint not null references league_match_role_schema(id) on delete cascade,
  role_code varchar(64) not null,
  rule_code varchar(64) not null,
  params_json jsonb not null default '{}'::jsonb
);
create index ix_lmrr_schema_id on league_match_role_rule(schema_id);
```

## 20. Anexo B - Matriz de bloqueo
1. `draft` + sin jornadas + sin partidos: se puede editar schema.
2. `draft` + jornadas generadas: bloqueo automatico recomendado.
3. `locked` + sin partidos finalizados: no editar estructura, solo metadata visual no puntuable.
4. `locked` + con partidos finalizados: bloqueo total.
