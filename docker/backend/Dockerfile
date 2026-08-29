FROM python:3.14.7-slim

WORKDIR /app

# Dependencias del sistema. El `upgrade` no es opcional: sin él los paquetes
# del sistema se quedan en la versión que traía la imagen base aunque Debian
# ya haya publicado el parche, y el escaneo de Trivy falla con CVEs que sí
# tienen corrección disponible.
RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    gosu \
    && rm -rf /var/lib/apt/lists/*

# Create runtime user/group for least privilege.
RUN groupadd -g 1000 appgroup \
    && useradd -u 10001 -g appgroup -m -s /usr/sbin/nologin appuser

# Copy requirements and install Python dependencies.
# Se actualizan antes pip, setuptools y wheel: la imagen base trae versiones
# con CVEs propios (jaraco.context vendorizado en setuptools, y wheel), que
# antes se silenciaban en .trivyignore en vez de corregirse.
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Runtime directories and entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
    && mkdir -p /app/static/uploads /app/logs \
    && chown -R appuser:appgroup /app

# Expose port
EXPOSE 8000

# Drop privileges at runtime while preserving mounted volume writability.
ENTRYPOINT ["/entrypoint.sh"]

# Command will be overridden in docker-compose for dev
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
