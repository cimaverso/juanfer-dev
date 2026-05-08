# ================================
# Stage 1: Builder
# ================================
FROM python:3.12-slim AS builder

# Instalar uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app

# Copiar archivos de dependencias primero (cache layer)
COPY pyproject.toml uv.lock ./

# Instalar dependencias en un virtualenv aislado
# --frozen: respeta el lockfile exacto
# --no-cache: no guarda cache en la imagen
RUN uv sync --frozen --no-cache --no-dev


# ================================
# Stage 2: Runtime
# ================================
FROM python:3.12-slim AS runtime

# Variables de entorno
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# Crear usuario no-root por seguridad
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --shell /bin/bash --create-home appuser

# Copiar solo el virtualenv desde el builder (sin uv, sin cache)
COPY --from=builder /app/.venv /app/.venv

# Copiar el código de la aplicación
COPY --chown=appuser:appgroup ./app ./app
COPY --chown=appuser:appgroup ./alembic ./alembic
COPY --chown=appuser:appgroup ./alembic.ini ./alembic.ini
COPY --chown=appuser:appgroup ./scripts ./scripts

# Cambiar al usuario no-root
USER appuser

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Comando de inicio
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]