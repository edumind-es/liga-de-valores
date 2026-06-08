# Checkpoint PWA/Offline - Liga EDUmind
**Fecha**: 5 de febrero de 2026
**Estado**: En progreso - Funcionalidad core implementada

---

## COMPLETADO

### 1. Infraestructura PWA
- [x] `manifest.json` con iconos y shortcuts
- [x] Service Worker con Workbox (vite-plugin-pwa)
- [x] Meta tags PWA en `index.html`
- [x] Estrategias de caché:
  - NetworkFirst para API (`/api/v1/*`)
  - CacheFirst para imágenes, fuentes, sonidos
  - Precaché de 20 archivos del app shell

### 2. Sistema Offline (IndexedDB)
- [x] `src/lib/offline/offlineDB.ts` - Wrapper IndexedDB con stores:
  - partidos, evaluaciones, equipos, ligas, tiposDeporte, pendingOperations
- [x] `src/hooks/useNetworkStatus.ts` - Detección de red + Zustand store
- [x] `src/hooks/useOfflineSync.ts` - Motor de sincronización con:
  - `saveWithOfflineSupport()` - Guardar con fallback offline
  - `deleteWithOfflineSupport()` - Eliminar con cola
  - Auto-sync al recuperar conexión (2s delay)
  - Umbral de conflicto: 5 minutos

### 3. Componentes UI Offline
- [x] `NetworkStatusIndicator` - Indicador en navbar
- [x] `ConflictResolutionDialog` - Resolución manual de conflictos
- [x] `OfflineProvider` - Wrapper en App.tsx

### 4. Integración en VerPartido.tsx
- [x] Carga desde IndexedDB cuando offline
- [x] Guardado de marcador con soporte offline
- [x] Guardado de evaluación con soporte offline
- [x] Banner visual "Modo sin conexión"
- [x] Botones deshabilitados apropiadamente (Finalizar, Acta, VT)
- [x] Mensajes contextuales según estado de red

### 5. Despliegue
- [x] Build exitoso (20 precache entries, 3187 KiB)
- [x] Desplegado en liga.edumind.es
- [x] Service Worker activo y funcionando

---

## PENDIENTE (para continuar)

### Prioridad Alta
- [ ] Añadir soporte offline a `ListaPartidos.tsx` (para ver lista de partidos cacheados)
- [ ] Probar flujo completo en dispositivo móvil real
- [ ] Verificar sincronización de conflictos

### Prioridad Media
- [ ] Añadir soporte offline a otras páginas críticas:
  - ListaJornadas
  - Clasificacion
- [ ] Mejorar UX de precarga (botón "Preparar para offline")

### Prioridad Baja
- [ ] Notificaciones push para sync completado
- [ ] Indicador de espacio usado en IndexedDB
- [ ] Exportar datos offline a JSON (backup manual)

---

## FLUJO DE USO ACTUAL

```
PREPARACIÓN (con WiFi):
1. Docente abre liga.edumind.es
2. Navega a Ligas → Liga X → Partidos → Partido Y
3. Datos se cachean automáticamente en IndexedDB

EN GIMNASIO (sin WiFi):
1. Abre app desde URL directa o marcador
2. Ve banner amarillo "Modo sin conexión"
3. Actualiza marcador → guardado local
4. Guarda evaluación → guardado local
5. NO puede finalizar (requiere servidor)

AL VOLVER (con WiFi):
1. App detecta conexión (~30s)
2. Sync automático en 2s
3. Si conflictos → Diálogo de resolución
4. Puede finalizar partido
```

---

## ARCHIVOS CLAVE MODIFICADOS

```
frontend/
├── index.html                    # Meta tags PWA
├── vite.config.ts               # VitePWA + code splitting
├── public/manifest.json         # PWA manifest
├── src/
│   ├── App.tsx                  # OfflineProvider wrapper
│   ├── lib/offline/offlineDB.ts # IndexedDB wrapper
│   ├── hooks/
│   │   ├── useNetworkStatus.ts  # Network detection
│   │   └── useOfflineSync.ts    # Sync engine
│   ├── components/
│   │   ├── offline/
│   │   │   ├── index.ts
│   │   │   ├── NetworkStatusIndicator.tsx
│   │   │   ├── ConflictResolutionDialog.tsx
│   │   │   └── OfflineProvider.tsx
│   │   └── layout/Navbar.tsx    # Network indicator
│   ├── pages/Partidos/
│   │   └── VerPartido.tsx       # Offline integration
│   └── i18n/locales/es.json     # Traducciones offline/conflict
```

---

## COMANDOS ÚTILES

```bash
# Rebuild frontend
cd /var/www/liga_edumind/frontend && npm run build

# Ver estado de contenedores
docker ps --filter "name=liga"

# Verificar SW en producción
curl -s https://liga.edumind.es/sw.js | head -5

# Verificar manifest
curl -s https://liga.edumind.es/manifest.json | jq .
```

---

## NOTAS TÉCNICAS

- **idb** library para IndexedDB (ya instalada)
- Conflict threshold: 5 minutos (`CONFLICT_THRESHOLD_MS`)
- Max retries para operaciones fallidas: 3
- Network check interval: 30 segundos
- Auto-sync delay: 2 segundos (estabilidad de red)
