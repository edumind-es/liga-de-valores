#!/bin/bash
#
# Wiki de Juegos - Limpieza automática de fichas pendientes
# Ejecutar diariamente vía cron
#
# Instalación:
#   sudo cp cleanup_wiki_juegos.sh /etc/cron.daily/
#   sudo chmod +x /etc/cron.daily/cleanup_wiki_juegos.sh
#
# O añadir a crontab:
#   0 3 * * * /var/www/liga_edumind/backend/scripts/cleanup_wiki_juegos.sh >> /var/log/wiki_cleanup.log 2>&1
#

cd /var/www/liga_edumind/backend
source venv/bin/activate

# Cargar variables de entorno
export $(grep -v '^#' .env | xargs)

# Ejecutar limpieza
python -m app.services.cleanup_service

echo "[$(date)] Wiki cleanup completed"
