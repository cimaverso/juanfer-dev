#!/bin/sh
# Entrypoint del contenedor backend: migra siempre (alembic ya es
# idempotente por su cuenta: no hace nada si ya está en head) y siembra
# solo si la DB está vacía (ver entrypoint_seed_if_empty.py), antes de
# levantar el servidor real.
set -e

echo "Aplicando migraciones..."
alembic upgrade head

echo "Verificando datos iniciales..."
python -m scripts.entrypoint_seed_if_empty

echo "Iniciando servidor..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
