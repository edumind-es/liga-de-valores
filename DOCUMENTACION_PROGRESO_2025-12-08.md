# DOCUMENTACIÓN DE PROGRESO LIGA EDUMIND
**Fecha:** 8 de Diciembre 2025
**Estado:** Estable / En Desarrollo de Funcionalidades Avanzadas

## 1. Resumen del Proyecto
Liga EDUmind es una plataforma de gestión de ligas deportivas escolares con un fuerte enfoque educativo. A diferencia de las ligas tradicionales, este sistema valora no solo los resultados deportivos, sino también el comportamiento ("Juego Limpio"), el desempeño arbitral y la animación respetuosa desde la grada, integrando a los alumnos en todos los roles del evento deportivo.

## 2. Arquitectura Frontend & Diseño

### Tecnologías Principales
*   **Framework:** React con Vite y TypeScript.
*   **Estilos:** Tailwind CSS v3.4.
*   **Gestión de Estado/Datos:** TanStack Query (React Query) y Zustand.
*   **Componentes UI:** Shadcn/UI (base), Radix UI (primitivas), Lucide React (iconos).

### Identidad Visual "Premium EDUmind"
El proyecto sigue una estética moderna y "premium" caracterizada por:
*   **Glassmorphism:** Uso extensivo de efectos de vidrio (`backdrop-blur`, bordes semitransparentes, fondos con baja opacidad) para tarjetas y contenedores sobre fondos oscuros.
*   **Paleta de Colores:**
    *   **Fondo:** Oscuro profundo (`bg-slate-950` / gradientes).
    *   **Acentos:** Mint (`text-mint`), Violeta, Azul y Naranja para diferenciar secciones.
    *   **Texto:** Blanco con alta legibilidad y jerarquía clara.
*   **Interacciones:** Sliders suaves para puntuaciones, transiciones en hovers de tarjetas, y retroalimentación visual inmediata (Toasts con Sonner).

### Componentes Característicos Implementados
1.  **Tablero de Gestión de Partidos (`VerPartido.tsx`):**
    *   Integra la puntuación deportiva y educativa en pestañas.
    *   **Sliders Interactivos:** Reemplazo de inputs numéricos por sliders para evaluar Árbitro (0-10) y Gradas (0-4), mejorando la UX.
    *   **Visibilidad de Roles:** Muestra claramente qué equipo ejerce de Árbitro y qué equipos están en la Grada Local/Visitante.
2.  **Dashboard de Liga (`VerLiga.tsx`):**
    *   Tarjetas de acceso rápido (Glass cards) para Equipos, Jornadas, Partidos y **Nueva**: Clasificación.
    *   Panel de configuración accesible.
3.  **Calendario Interactivo (`ListaJornadas.tsx`):**
    *   Vista de acordeón para las jornadas, permitiendo expandir/colapsar partidos para una mejor visión global.
4.  **Acceso Público (`PublicLayout`, `PublicLogin`):**
    *   Interfaz simplificada para alumnos.
    *   Sistema de autenticación mediante PIN de liga.

## 3. Funcionalidades Clave Introducidas

### Gestión Deportiva y Educativa
*   **Sistema de Roles Rotativos:** El algoritmo de generación de calendario asigna 5 equipos por partido: Local, Visitante, Árbitro, Grada Local, Grada Visitante.
*   **Puntuación MRPS:** Cálculos automáticos en backend para puntos de Juego Limpio, Arbitraje (si media >= 5) y Grada.

### Configuración y Acceso
*   **Configuración de Liga:** Nueva sección "Acceso para Alumnos" donde el docente define un **PIN de 6 dígitos**.
*   **Enlace Público:** Generación automática de enlace compartible para que los alumnos accedan a su vista restringida.

### Mejoras Técnicas Backend
*   **API REST (FastAPI):** Endpoints robustos bajo `/api/v1`.
*   **Modelos de Datos:** Actualización de `Equipo` y `Partido` para soportar los nuevos roles y métricas.
*   **Proxy Inverso:** Configuración de Nginx y Docker para servir frontend y backend en un mismo origen, eliminando problemas de CORS en producción.

## 4. Hoja de Ruta (Roadmap) - Próximos Pasos

### Corto Plazo (Estabilización y Pulido)
1.  **Validación Móvil:** Realizar un "pass" completo de QA en resoluciones móviles para asegurar que los nuevos Sliders y las tablas de clasificación se vean perfectos en teléfonos.
2.  **Feedback Visual en Clasificación:** Destacar visualmente en la tabla de clasificación quién va ganando en "Deportividad" vs "Puntos Totales".

### Medio Plazo (Expansión Funcional)
3.  **Analytics de Equipo Avanzados:** Crear una vista detallada para cada equipo que muestre su evolución en calificaciones de arbitraje y comportamiento a lo largo de la temporada (gráficas de línea).
4.  **Exportación Mejorada:** Añadir opciones para exportar actas de partidos individuales en PDF.
5.  **Gestión de Usuarios:** Permitir al docente resetear contraseñas de equipos o regenerar tokens QR si se pierden.

### Largo Plazo (Innovación)
6.  **Gamificación:** Implementar "Badges" o medallas virtuales que aparezcan en el perfil del equipo (ej: "Racha de Juego Limpio", "Mejor Árbitro del Mes").
7.  **Notificaciones:** Sistema de avisos (email o in-app) cuando se cierra un acta o se publica una nueva jornada.

---
*Documento generado automáticamente por Antigravity tras la sesión de desarrollo del 8 de Diciembre de 2025.*
