# Instrucciones para Integración n8n y Base de Datos

Sigue estos pasos para activar el sistema de propuestas de deporte.

## 1. Configuración Base de Datos (PostgreSQL)

Necesitas crear una tabla para almacenar las propuestas. Hemos diseñado un esquema que es compatible con tu tabla `tipos_deporte` para facilitar la migración futura.

Ejecuta este SQL en tu base de datos:

```sql
CREATE TABLE sport_proposals (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    tipo_marcador VARCHAR(20) NOT NULL, -- "goles", "sets", "puntos", "tries"
    descripcion TEXT CHECK (length(descripcion) >= 20),
    web_url VARCHAR(255),
    email_contacto VARCHAR(100) NOT NULL,
    
    -- Estado de la propuesta
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    admin_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Opcional: Crear índice para búsquedas por estado
CREATE INDEX idx_sport_proposals_status ON sport_proposals(status);
```

## 2. Flujo n8n (Webhook)

El formulario en React enviará un JSON por POST a tu webhook.

### Datos del Webhook
El JSON recibido tendrá este formato:
```json
{
  "nombre": "Pickleball",
  "tipo_marcador": "sets",
  "descripcion": "Juego de pala con...",
  "web": "https://...",
  "email": "usuario@ejemplo.com"
}
```

### Configuración del Workflow

1.  **Nodo Webhook**:
    e.  Método: `POST`
    *   Path: `sport-proposal` (o el que prefieras)
    *   Authentication: `None` (o Header Auth si configuras el frontend para enviarlo)
    *   **IMPORTANTE**: Copia la URL de Producción y añádela a tu archivo [.env](file:///var/www/liga_edumind/backend/.env) en el frontend:
        `VITE_N8N_WEBHOOK_URL=https://tu-n8n.com/webhook/sport-proposal`

2.  **Nodo Postgres (Insert)**:
    *   Operation: `Insert`
    *   Schema: `public`
    *   Table: `sport_proposals`
    *   Columns: Mapea los campos del JSON a las columnas de la tabla.
        *   `nombre` -> `nombre`
        *   `tipo_marcador` -> `tipo_marcador`
        *   `descripcion` -> `descripcion`
        *   `web` -> `web_url`
        *   `email` -> `email_contacto`

3.  **Nodo Email / Slack / Telegram (Notificación)**:
    *   Conecta este nodo tras el éxito del Insert.
    *   Mensaje sugerido:
        > 🚀 **Nueva Propuesta de Deporte**
        > **Deporte:** {{json.nombre}}
        > **Marcador:** {{json.tipo_marcador}}
        > **Contacto:** {{json.email}}
        >
        > <a href="https://tu-panel-admin.com/proposals">Revisar en Panel</a>

## 3. Despliegue Frontend

Una vez configurado el [.env](file:///var/www/liga_edumind/backend/.env) con la URL del Webhook:
1.  Reconstruye el frontend: `npm run build`
2.  Despliega los cambios.
