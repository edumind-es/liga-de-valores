# Liga de Valores

Gestión de ligas deportivas escolares donde **no solo puntúa el marcador**. Cada partido reparte puntos por juego limpio, por el arbitraje del alumnado y por el comportamiento de la grada. Backend en FastAPI, frontend en React, con vistas públicas para proyectar en el aula o el pabellón.

> El objetivo pedagógico es que ganar el partido no baste para ganar la liga.

## Arrancar en local

Frontend:

```bash
cd frontend
npm install
npm run build
```

Backend:

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

Copia `.env.example` a `.env` y rellénalo. Los valores del ejemplo son marcadores: genera secretos nuevos para cualquier despliegue real.

## Pruebas

```bash
cd backend && pytest         # backend
cd frontend && npm run test  # frontend
```

## Colaborar

Se puede colaborar **sin programar**: contar cómo te ha ido en clase, reportar un fallo, revisar los textos o traducir. Todo el proyecto está en español. Empieza por [CONTRIBUTING.md](CONTRIBUTING.md) y el [código de conducta](CODE_OF_CONDUCT.md).

¿Un fallo de seguridad? No abras un issue público: ver [SECURITY.md](SECURITY.md).

Este repositorio es una *release saneada* para revisión y auditoría: no incluye secretos, configuración de despliegue ni datos de aula. Ver [OPEN_SOURCE_RELEASE.md](OPEN_SOURCE_RELEASE.md).

## Licencia

Licencia doble **AGPL-3.0-or-later** *o* **EUPL-1.2**, a elección de quien la reutilice. Ver [LICENSE](LICENSE) y [NOTICE](NOTICE).

EDUmind® es marca registrada en España (OEPM). El código es libre; la marca y los logotipos no se ceden con él — ver [TRADEMARKS.md](TRADEMARKS.md).

Por **Luis Vilela Acuña** — maestro de Educación Física.
