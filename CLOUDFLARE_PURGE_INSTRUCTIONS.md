# Cloudflare Cache Purge Instructions

## El Problema
Cloudflare está cacheando la configuración antigua (liga_valores Flask) y NO está sirviendo la nueva app React.

## Solución: Purge Agresivo en Cloudflare

### Paso 1: Purge Everything NO es suficiente
Ya lo hiciste pero Cloudflare tiene múltiples capas de caché.

### Paso 2: Development Mode (RECOMENDADO)
1. Ve a Cloudflare Dashboard
2. Selecciona dominio `edumind.es`
3. Ve a **Caching** → **Configuration**
4. Activa **"Development Mode"** 
5. Esto desactiva el cache por 3 horas

### Paso 3: Purge by URL (Específico)
Si Development Mode no funciona:

1. **Caching** → **Configuration**
2. **Custom Purge** → **Purge by URL**
3. Ingresa ESTAS URLs una por una:
   ```
   https://liga.edumind.es/
   https://liga.edumind.es/register
   https://liga.edumind.es/login
   https://liga.edumind.es/api/*
   ```

### Paso 4: Verificar Configuración DNS
Asegúrate que el registro DNS apunta correctamente:

**DNS Record**:
- Type: `A`
- Name: `liga`
- Content: `65.108.204.86`
- Proxy status: 🟠 Proxied (puede cambiar a DNS Only temporalmente)

### Paso 5: TEMPORAL - DNS Only
Si nada funciona, cambia temporalmente:

1. DNS settings
2. Encuentra `liga.edumind.es`
3. Click en la nube 🟠 para cambiar a ⚙️ (DNS Only)
4. Espera 5 minutos
5. Prueba acceder
6. Vuelve a activar Proxy después

## Verificación Desde el Servidor
El servidor SÍ está sirviendo React correctamente:

```bash
# Acceso directo sin Cloudflare
curl -H "Host: liga.edumind.es" https://65.108.204.86 -k

# Debería devolver:
<!doctype html>
<html lang="en">
<title>frontend</title>
```

Si el comando anterior devuelve React, el problema ES Cloudflare cache.

## Estado Actual del Servidor
✅ Nginx configurado correctamente
✅ SSL activo
✅ Frontend React en /var/www/liga_edumind/frontend/dist
✅ Backend Docker en puerto 8001
✅ Acceso directo funciona

❌ Cloudflare cacheando versión antigua
