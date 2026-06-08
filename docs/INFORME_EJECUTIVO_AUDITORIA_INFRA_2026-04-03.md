# Informe Ejecutivo de Auditoria Infraestructura - 2026-04-03

## Resumen ejecutivo

Liga EDUmind se encuentra en un estado de produccion util y estable, con una base tecnica claramente mas madura que la media de una aplicacion construida por iteracion rapida. El backend responde bien, el frontend compila limpio, el contrato de rutas esta controlado, el despliegue real esta operativo y existen copias de seguridad diarias con sincronizacion remota.

Sin embargo, la auditoria confirma que todavia no conviene catalogarla como infraestructura "definitiva" sin una ultima tanda de consolidacion operativa. El nucleo de la app es fiable; los riesgos restantes se concentran en alineacion de esquema, salud real del servicio, endurecimiento de secretos, cabeceras de seguridad y calidad continua del frontend.

## Estado general

### Backend

Estado: bueno

Fortalezas:

- auth por cookies seguras ya consolidada;
- OIDC/AuthentiK operativo en produccion;
- suite backend con cobertura razonable;
- ejecucion del proceso como usuario no root;
- contrato de rutas validado sin drift.

Debilidades:

- healthcheck superficial;
- base de datos desplegada por detras del `head` de Alembic;
- configuracion sensible aun mejorable;
- warnings de mantenimiento en dependencias.

### Frontend

Estado: bueno con deuda de calidad continua

Fortalezas:

- build estable;
- enfoque `privacy first` respetado;
- politica offline explicita y no invasiva;
- experiencia PWA ya funcional;
- interfaz publica y privada mucho mas coherente que en fases previas.

Debilidades:

- no hay tests automatizados del frontend;
- bundle y precache aun pesados para entornos de conectividad debil;
- parte del metadato de build sigue siendo tecnico y no totalmente pensado para usuarios finales.

### Despliegue

Estado: correcto, pero no todavia "cerrado"

Fortalezas:

- contenedores principales saludables;
- backup diario local y remoto funcionando;
- docs de produccion deshabilitadas;
- metricas protegidas;
- backend publicado solo por localhost para Nginx.

Debilidades:

- imagenes base sin pinning estricto;
- ausencia de cabeceras modernas tipo CSP;
- secreto OIDC con permisos mas amplios de lo ideal en host;
- esquema de base no totalmente alineado con el codigo desplegado.

## Hallazgos priorizados

### P0 - Debe resolverse antes de declarar la infraestructura como cerrada

#### 1. Alembic en produccion no esta en `head`

Severidad: alta

Situacion:

- `alembic heads` apunta a `022_public_pin_unique`;
- `alembic current` y la tabla `alembic_version` siguen en `021_submission_policy`.

Impacto:

- deriva entre codigo y esquema real;
- riesgo de errores futuros al desplegar cambios que asuman la revision `022`;
- inconsistencia operativa: hoy funciona, pero no esta completamente alineado.

Riesgo de no actuar:

- problemas silenciosos en migraciones siguientes;
- fallos en despliegues posteriores;
- falsa sensacion de cierre tecnico.

Accion:

1. Ejecutar `alembic upgrade head` en el backend productivo.
2. Confirmar que la revision activa pasa a `022_public_pin_unique`.
3. Verificar de nuevo que no existan duplicados de `public_pin`.

Criterio de aceptacion:

- `alembic current` = `022_public_pin_unique`
- indice `ux_ligas_public_pin_not_null` presente en BD

#### 2. Healthcheck insuficiente para produccion

Severidad: alta

Situacion:

- Docker marca salud solo por respuesta HTTP de `/api/health`;
- ese endpoint no verifica PostgreSQL ni Redis.

Impacto:

- puede aparecer `healthy` aunque la app haya perdido dependencias reales;
- dificulta alertado correcto y automatismos de recuperacion.

Riesgo de no actuar:

- deteccion tardia de incidentes;
- reinicios inutiles o ausencia de reaccion ante una degradacion real.

Accion:

1. Reescribir `/api/health` para comprobar:
   - conectividad a PostgreSQL;
   - conectividad a Redis;
   - estado basico de escritura/lectura de dependencias.
2. Mantener un `liveness` ligero y un `readiness` real si se quiere separar responsabilidades.
3. Ajustar el `healthcheck` de Docker a ese endpoint real.

Criterio de aceptacion:

- si PostgreSQL cae, el servicio deja de marcar `healthy`;
- si Redis cae, el servicio deja de marcar `healthy`;
- la app sigue respondiendo con tiempos aceptables en operacion normal.

#### 3. Endurecimiento de secretos y politica de lectura

Severidad: alta

Situacion:

- el secreto OIDC se resolvio funcionalmente dejando lectura mas abierta en host para que el contenedor pudiera arrancar;
- es una solucion operativa valida, pero no la mas estricta.

Impacto:

- superficie innecesaria para un secreto sensible;
- peor higiene de credenciales de la deseable en un entorno ya productivo.

Riesgo de no actuar:

- exposicion accidental a otros procesos o usuarios con acceso lateral;
- mantenimiento mas fragil al crecer el ecosistema.

Accion:

1. Sustituir el bind mount actual por una estrategia de secreto mas estricta:
   - Docker secret real, o
   - bind mount con permisos y ownership compatibles con `UID 10001` sin abrir lectura global.
2. Revisar todos los secretos montados con el mismo criterio.
3. Rotar el `client_secret` OIDC tras rehacer la cadena de permisos.

Criterio de aceptacion:

- el backend puede leer el secreto;
- el secreto no necesita permiso world-readable;
- el secreto OIDC queda rotado y documentado.

### P1 - Muy recomendable en la siguiente ventana de consolidacion

#### 4. Anadir cabeceras modernas de seguridad web

Severidad: media-alta

Falta:

- `Content-Security-Policy`
- `Permissions-Policy`
- `Cross-Origin-Opener-Policy` o equivalentes si se estiman compatibles

Impacto:

- menos defensa del navegador frente a XSS y abuso de capacidades;
- dependencia excesiva de que el codigo no se equivoque nunca.

Accion:

1. Definir una CSP inicial compatible con:
   - build Vite;
   - PWA;
   - fuentes y recursos realmente usados;
   - AuthentiK y servicios legitimos.
2. Desplegar primero en modo monitorizado si hace falta.
3. Endurecer progresivamente.

#### 5. Pinning de imagenes base

Severidad: media

Situacion:

- se usan tags flotantes para PostgreSQL, Redis y Python base.

Impacto:

- rebuilds no deterministas;
- posibilidad de cambios inesperados por actualizaciones upstream.

Accion:

1. Fijar digests o tags patch concretos en `docker-compose.prod.yml` y `Dockerfile`.
2. Documentar politica de actualizacion de imagenes.

#### 6. Reducir fragilidad del backup script

Severidad: media

Situacion:

- el backup funciona y esta demostrablemente operativo;
- aun asi, `docker exec -t` no es la opcion mas robusta para cron.

Accion:

1. Quitar `-t` del `pg_dump` automatizado.
2. Anadir comprobacion explicita de retorno de `rclone`.
3. Valorar restauracion de prueba periodica.

### P2 - Calidad y mejora continua

#### 7. Crear una suite minima de tests frontend

Severidad: media

Objetivo:

- cubrir login;
- rutas publicas clave;
- modo offline basico;
- render de componentes criticos.

Accion:

1. Anadir stack de test frontend.
2. Crear smoke tests sobre:
   - `Login`
   - `PublicDashboard`
   - `PublicTeamPortal`
   - `RepositorioJuegos`
3. Integrarlo en `release gate`.

#### 8. Reducir peso de bundle y precache

Severidad: media

Objetivo:

- mejorar experiencia en redes lentas;
- reducir tiempo de actualizacion PWA.

Accion:

1. Revisar carga diferida de:
   - `jspdf`
   - `konva`
   - `recharts`
   - `html2canvas`
2. Valorar import dinamico por ruta.
3. Revisar si toda la precache es necesaria.

#### 9. Actualizar documentacion raiz

Severidad: baja

Situacion:

- el README no representa fielmente el estado tecnico actual.

Accion:

1. Corregir stack frontend real.
2. Documentar produccion real:
   - cookies seguras;
   - AuthentiK;
   - PWA/offline;
   - private release policy;
   - backup/restore;
   - health/observabilidad.

## Plan de remediacion recomendado

### Ventana 1 - Cierre de consolidacion operativa

Duracion estimada: 0.5 a 1 dia

Objetivo:

- dejar la plataforma alineada y tecnicamente cerrada para produccion estable.

Tareas:

1. Ejecutar migracion `022_public_pin_unique`.
2. Verificar estado de Alembic en produccion.
3. Endurecer secreto OIDC y rotarlo.
4. Documentar la nueva cadena de secreto segura.

Riesgo:

- bajo, si se hace con backup previo.

### Ventana 2 - Salud real y endurecimiento web

Duracion estimada: 1 a 2 dias

Objetivo:

- mejorar capacidad de deteccion y defensa.

Tareas:

1. Rehacer `/api/health`.
2. Ajustar healthcheck Docker.
3. Introducir CSP minima y `Permissions-Policy`.
4. Validar que SSO, PWA y recursos publicos no rompen.

Riesgo:

- medio, por posibles incompatibilidades iniciales de CSP.

### Ventana 3 - Calidad continua

Duracion estimada: 2 a 4 dias

Objetivo:

- bajar riesgo de regresion.

Tareas:

1. Suite minima de frontend.
2. Integracion en release gate.
3. Primeras optimizaciones de bundle.

Riesgo:

- bajo-medio.

## Orden exacto recomendado

1. Backup manual previo.
2. Migracion a `head`.
3. Endurecimiento y rotacion del secreto OIDC.
4. Healthcheck real.
5. CSP minima y politicas del navegador.
6. Ajuste del backup script.
7. Tests frontend.
8. Optimizacion de bundle.
9. Actualizacion de README y runbooks.

## Esfuerzo total estimado

- Cierre minimo para considerar infraestructura consolidada: `1 a 3 dias`
- Cierre mas completo con calidad continua: `4 a 7 dias`

## Criterio para declarar "produccion definitiva y consolidada"

Se puede declarar cerrada cuando se cumplan estos puntos:

- Alembic en `head`
- secreto OIDC endurecido y rotado
- health real de app + PostgreSQL + Redis
- CSP minima desplegada sin roturas
- backups diarios verificados y restauracion documentada
- smoke tests frontend integrados en pipeline o release gate

## Veredicto final

Liga EDUmind ya no esta en fase fragil. La app esta en una franja de produccion estable y seria. Lo que queda no es rescate estructural, sino la ultima capa de consolidacion que separa una buena app en produccion de una infraestructura realmente madura.

Mi recomendacion como auditor senior es clara:

- si el objetivo es operar con tranquilidad, ejecutar ya la Ventana 1 y la Ventana 2;
- si el objetivo es tambien escalar con menos riesgo de regresion, ejecutar despues la Ventana 3.
