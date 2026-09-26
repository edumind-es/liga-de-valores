# Frontend de Liga de Valores

Aplicación React 19 + TypeScript compilada con Vite; PWA con service worker
(`vite-plugin-pwa`) y copia offline en IndexedDB para el gimnasio sin WiFi.
El README general del proyecto (qué hace, qué guarda, cómo modificarlo) está
en [../README.md](../README.md).

## Comandos

```bash
npm ci               # instalar dependencias tal y como fija package-lock.json
npm run dev          # servidor de desarrollo (http://localhost:5173, API en /api/v1)
npm run build        # tsc + vite build → dist/
npm run test:run     # pruebas con Vitest (carpeta tests/)
npm run lint         # ESLint
npm run preview      # servir dist/ en local
```

Variables: copia `.env.example` a `.env`. `VITE_API_URL` apunta a la API
(`/api/v1` por defecto) y `VITE_AUTHENTIK_ENABLED` activa el botón de SSO.

## Mapa de carpetas

| Carpeta | Qué hay |
|---|---|
| `src/pages/` | una carpeta o fichero por pantalla: `Ligas/`, `Equipos/`, `Jornadas/`, `Partidos/`, `Public/` (PIN, wiki, generador de fichas), `Express/` (marcador sin cuenta), `Resources/`, `FAQ.tsx`, `PwaGuide.tsx`… |
| `src/components/` | componentes reutilizables: `ui/` (base shadcn/Radix), `forms/`, `gamesheet/` (fichas y pictogramas ARASAAC), `accessibility/` (menú de accesibilidad), `layout/` |
| `src/layouts/` | `PublicLayout` y la cáscara editorial de las páginas públicas |
| `src/lib/` | utilidades de app: `offline/` (IndexedDB y sincronización), `audio.ts` (silbato y gol), `mundos.ts` (Los Cinco Mundos), `react-query.ts` |
| `src/i18n/locales/` | textos en `es.json`, `gl.json` y `en.json` |
| `src/store/` | estado global (zustand), incluida la sesión |
| `src/api/` y `src/utils/` | cliente HTTP y ayudas (`arasaac.ts`, `url.ts`) |
| `public/` | estáticos: `fonts/` (tipografías locales con `OFL.txt`), `sounds/`, `icons/`, `vendor/lamina-v1.css` (sistema visual Lámina), manifiestos PWA |
| `tests/` | pruebas Vitest + Testing Library |

## Convenciones

- Colores solo a través de tokens CSS (`--ink`, `--sub`, `--mint`, `--sky`, `--vio`, `--editorial-*`) definidos en `src/index.css`; así funcionan el modo e-ink, el alto contraste y el pie sin reescribir componentes.
- Tipografías en local (`public/fonts`); no añadir `<link>` a Google Fonts ni otros CDN: la app no debe cargar nada de terceros al abrirse.
- Iconos: `lucide-react`. Componentes base: `src/components/ui` (Radix).
- Todo el código, los comentarios y los textos de pantalla en español (gallego e inglés vía i18n).
- Cabecera de licencia AGPL en cada fichero fuente nuevo (copiar de cualquier `.tsx` existente).
