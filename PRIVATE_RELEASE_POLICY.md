# Política De Versionado Privado y Publicación

## Objetivo
Garantizar que cada cambio se valide primero en una versión privada antes de promover una versión pública.

## Flujo Implementado
1. Cada `push` / `pull_request` ejecuta CI con versionado automático por Conventional Commits.
2. CI calcula:
   - `public_version` candidata (`major`/`minor`/`patch`).
   - `private_version` para validación interna (`<public>-private.<timestamp>.r<run>+<sha>`).
3. CI construye artefactos privados (frontend) con `APP_VERSION=private_version`.
4. **No** hay publicación pública automática en push.
5. La publicación pública solo se hace por `workflow_dispatch` con `publish_public=true`.

## Reglas SemVer
- `major`: commit con `!` (ej. `feat!:`) o `BREAKING CHANGE:`.
- `minor`: commit `feat:`.
- `patch`: `fix:`, `perf:`, `refactor:`, `revert:` y fallback conservador.

## Scripts
- `scripts/versioning/detect-conventional-bump.sh`
- `scripts/versioning/semver-bump.sh`
- `scripts/versioning/private-version.sh`

## Operación Recomendada
1. Validar versión privada en entorno interno.
2. Ejecutar release gate SaaS.
3. Solo si pasa todo, lanzar `workflow_dispatch` con `publish_public=true`.
