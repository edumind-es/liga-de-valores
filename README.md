# 🏆 Liga EDUmind

Sistema de gestión de ligas deportivas escolares desarrollado por [EDUmind](https://edumind.es).

![Liga EDUmind](https://liga.edumind.es/liga_logo_oficial.png)

## ✨ Características

- 📋 **Gestión de ligas**: Crea y administra múltiples ligas deportivas
- 👥 **Equipos y jugadores**: Registro completo de equipos con logos y jugadores
- 📅 **Calendarios automáticos**: Generación automática de jornadas y partidos
- 📊 **Clasificaciones en tiempo real**: Tablas de posiciones actualizadas automáticamente
- ⚽ **Modo Express**: Partidos rápidos sin necesidad de crear toda una liga
- 📺 **Scoreboard en vivo**: Marcador en tiempo real para mostrar en pantallas
- 📄 **Actas de partido**: Generación automática de actas con incidencias
- 🔔 **Notificaciones**: Sistema de avisos para partidos y eventos

## 🛠️ Tecnologías

### Backend
- **Python 3.11+** con FastAPI
- **PostgreSQL** como base de datos
- **SQLAlchemy** ORM
- **Alembic** para migraciones

### Frontend
- **React 18** con TypeScript
- **Vite** como bundler
- **React Router** para navegación
- **CSS Modules** para estilos

## 🚀 Instalación

### Requisitos previos
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Ejecutar migraciones
alembic upgrade head

# Iniciar servidor
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend estará disponible en `http://localhost:5173`

## 📁 Estructura del Proyecto

```
liga_edumind/
├── backend/
│   ├── app/
│   │   ├── api/          # Endpoints de la API
│   │   ├── models/       # Modelos SQLAlchemy
│   │   ├── schemas/      # Schemas Pydantic
│   │   ├── services/     # Lógica de negocio
│   │   └── main.py       # Punto de entrada
│   ├── alembic/          # Migraciones
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # Componentes reutilizables
│   │   ├── pages/        # Páginas de la aplicación
│   │   ├── services/     # Llamadas a la API
│   │   └── App.tsx       # Componente principal
│   └── package.json
└── README.md
```

## 🎯 Demo

Puedes ver el sistema en funcionamiento en: **[liga.edumind.es](https://liga.edumind.es)**

## 🔐 Política de Releases

El repositorio usa una estrategia **private-first**:

- Cada cambio genera una versión privada automática para validación interna.
- La publicación pública **no** se hace automáticamente en cada push.
- La release pública solo se ejecuta de forma manual tras verificación.

Detalle operativo: `PRIVATE_RELEASE_POLICY.md`

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor, lee las guías de contribución antes de enviar un Pull Request.

1. Fork el proyecto
2. Crea tu rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📧 Contacto

**EDUmind** - [hola@edumind.es](mailto:hola@edumind.es)

- Web: [edumind.es](https://edumind.es)
- Twitter: [@edumind_es](https://twitter.com/edumind_es)

---

<p align="center">
  Hecho con ❤️ por <a href="https://edumind.es">EDUmind</a> para la educación física
</p>
