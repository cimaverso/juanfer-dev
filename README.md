# Juanfer Seguros

Sistema interno de trazabilidad y seguimiento de clientes y prospectos con sus pólizas, más formularios públicos por URL para asegurados e interesados (sin necesidad de cuenta).

Detalle de propósito y alcance: [`docs/PROPOSITO.md`](docs/PROPOSITO.md).

## Stack

| Capa | Tecnología |
|---|---|
| Backend | FastAPI (Python ≥ 3.12, gestor `uv`) |
| ORM / migraciones | SQLAlchemy 2 **síncrono** + `psycopg` 3 + Alembic |
| Base de datos | PostgreSQL 16 |
| Frontend | React 19 + Vite, **JavaScript** (sin TypeScript), gestor `npm` |
| Despliegue | Docker Compose + nginx (reverse proxy) |

## Estructura del repositorio

```
backend/    API FastAPI: app/{core,db,models,routers,schemas,services}, alembic/, tests/, scripts/
frontend/   SPA React + Vite: src/{api,components,context,pages,router,styles}
nginx/      Configuración del reverse proxy para el despliegue en contenedores
docs/       Documentación viva del proyecto (ver tabla abajo)
```

## Desarrollo local (nativo, sin Docker para la app)

Pensado para trabajar día a día: backend y frontend corren nativos; solo Postgres va en un contenedor Docker aparte.

```bash
# Backend
cd backend
uv sync
cp .env.example .env            # completar DATABASE_URL, SECRET_KEY, etc.
uv run alembic upgrade head
uv run python -m scripts.seed_data   # datos iniciales (catálogos, roles, permisos, usuarios)
uv run uvicorn app.main:app --reload   # http://localhost:8000 (docs en /docs)

# Frontend (otra terminal)
cd frontend
npm install
cp .env.example .env
npm run dev                      # http://localhost:5173
```

Requiere un Postgres 16 corriendo en el puerto que apunte tu `DATABASE_URL` (en desarrollo: contenedor Docker aparte, fuera de este repo). Guía completa, paso a paso y con solución de problemas: [`docs/GUIA.md`](docs/GUIA.md).

## Despliegue con Docker Compose

```bash
cp .env.example .env                        # DB_USER / DB_PASSWORD / DB_NAME, para el servicio db
cp backend/.env.example backend/.env        # SECRET_KEY, RESEND_*, CORS_ORIGINS
docker compose up -d --build
```

El contenedor del backend aplica las migraciones y siembra los datos iniciales **automáticamente en el primer arranque** (solo si la base está vacía; en arranques posteriores omite el seed sin duplicar nada). nginx expone todo bajo un mismo origen: `/` sirve el frontend, `/api/` el backend. No hace falta ningún paso manual adicional.

Probado de punta a punta (2026-10-29): build de las 4 imágenes, migraciones + seed en el primer arranque, reinicio del contenedor sin reseed, y login real a través de nginx.

Pendiente de decidir antes de un despliegue real en VPS: estrategia de build/publish de las imágenes (manual, CI/CD o Dokploy) — ver `docs/DEUDA.md` DT-005.

## Pruebas

```bash
cd backend && uv run pytest        # suite completa contra la DB de desarrollo, aislada con SAVEPOINT
cd frontend && npm run lint        # frontend no tiene suite de pruebas automatizadas todavía (ver docs/DEUDA.md DT-006)
```

## Documentación viva

Antes de trabajar en este proyecto, lee `CLAUDE.md` (reglas de colaboración) y luego:

| Documento | Para qué |
|---|---|
| [`docs/ESTADO.md`](docs/ESTADO.md) | Dónde quedó el trabajo y el siguiente paso |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Qué sigue y por qué |
| [`docs/REQUISITOS.md`](docs/REQUISITOS.md) | Qué debe cumplir el sistema |
| [`docs/DECISIONES.md`](docs/DECISIONES.md) | Por qué se decidió cada cosa |
| [`docs/DEUDA.md`](docs/DEUDA.md) | Atajos y riesgos asumidos, con su disparador de pago |
| [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) | Cómo está construido |
| [`docs/GUIA.md`](docs/GUIA.md) | Instalar, configurar, ejecutar, desplegar |
| [`docs/modulos/`](docs/modulos/) | Un documento por módulo, cuando existe |

## Fuera de alcance (por ahora)

Integraciones con servicios externos salvo Resend (notificación por correo de formularios), pagos y facturación, app móvil, portal del cliente.
