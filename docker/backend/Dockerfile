FROM python:3.11.15-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    gosu \
    && rm -rf /var/lib/apt/lists/*

# Create runtime user/group for least privilege.
RUN groupadd -g 1000 appgroup \
    && useradd -u 10001 -g appgroup -m -s /usr/sbin/nologin appuser

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

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
