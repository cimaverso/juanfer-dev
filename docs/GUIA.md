# Guía de instalación y operación
Probada en: Windows (PowerShell 5.1 y Git Bash) · Python 3.12.13 · uv 0.10.8 · Node 20.19.1 / npm 10.8.2 · Git 2.45.2 · Docker 26.1.4
Última verificación desde cero: nunca. Esta guía se armó leyendo el repo y el entorno del desarrollador; ningún paso se ha ejecutado todavía en un clon limpio. Lo no comprobado va marcado [SUPUESTO] o [PENDIENTE].

Alcance: desarrollo local con comandos nativos de cada stack (D-005). El despliegue está en [PENDIENTE]. Los comandos de este documento se ejecutan en **Git Bash** (D-006), salvo que se indique otra cosa.

## 1. Requisitos previos
| Herramienta | Versión | Cómo comprobar |
|---|---|---|
| Python | 3.12 (el proyecto exige ≥3.12) | `python --version` |
| uv | 0.10.8 usada | `uv --version` |
| Node + npm | Node 20 (la usada: 20.19.1) | `node -v && npm -v` |
| Git + Git Bash | 2.45.2 usada | `git --version` |
| Docker Desktop | 26.1.4 usada | `docker --version` |
| PostgreSQL 16 | corre en contenedor; no se instala en Windows | ver sección 4 |
| pgAdmin | opcional, para inspeccionar la base | — |
| Internet | los iconos (Bootstrap Icons 1.11.3) se cargan por CDN desde `index.html` | — |

No hay `psql` en Windows: se usa `docker exec` o pgAdmin.

## 2. Instalación
```bash
git clone https://github.com/cimaverso/juanfer-dev.git && cd juanfer-dev
git checkout desarrollo
(cd backend && uv sync)
(cd frontend && npm install)
```

## 3. Configuración
Los `.env` viven junto a cada app (no hay `.env` en la raíz). Cada uno tiene su `.env.example` en la misma carpeta.
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```
| Variable | Qué es | Obligatoria | Dónde obtenerla | Ejemplo no real |
|---|---|---|---|---|
| `DATABASE_URL` (backend) | Conexión a Postgres, con driver `psycopg` | sí | Datos del contenedor local (sección 4) | `postgresql+psycopg://usuario:clave@127.0.0.1:5433/nombre_db` |
| `SECRET_KEY` (backend) | Clave para firmar los JWT | sí | Generar: `python -c "import secrets; print(secrets.token_urlsafe(48))"` | `cadena-larga-aleatoria` |
| `VITE_API_URL` (frontend) | URL del backend | no | Por defecto `http://localhost:8000` | `http://localhost:8000` |
| `VITE_USE_MOCK` (frontend) | `true` usa datos locales (`mocks/`) en vez del backend | no | — | `false` |
| `RESEND_APIKEY` (backend) | API key de la cuenta de Resend | no* | Dashboard de Resend → API Keys | `re_xxxxxxxx` |
| `RESEND_CORREO` (backend) | Correo que recibe la notificación de cada formulario respondido | no* | — | `nombre@dominio.com` |
| `RESEND_REMITENTE` (backend) | Remitente del correo | no | Por defecto `onboarding@resend.dev` si falta | `notificaciones@tudominio.com` |
| `CORS_ORIGINS` (backend) | Orígenes permitidos por CORS, separados por coma | no | Por defecto solo `http://localhost:5173` (Vite) | `http://localhost:5173,https://midominio.com` |

\* Sin `RESEND_APIKEY`/`RESEND_CORREO` el correo simplemente no se envía (`FormularioRespuesta.correo_estado` queda en `fallido`), no rompe nada más.
Nunca commitear `.env`. Hoy ningún `.env` está rastreado en git y `.gitignore` los cubre (`.env`, `.env.*`, con excepción de `!.env.example`).

## 4. Base de datos
La base local es el contenedor **`juanfer_postgres`** (puerto de host 5433, base `juanfer_db`, usuario `juanferseg`), que es el que apunta el `backend/.env` del desarrollador. **No está definido en el repo** (DT-012): es un contenedor suelto, no parte de este `docker-compose.yml` (ese define su propio Postgres para despliegue en contenedores, `juanfer_db` en el puerto 5434, sin relación con el de desarrollo). Si hay que recrearlo desde cero en otra máquina, un comando equivalente [SUPUESTO, no es necesariamente el usado originalmente] es:
```bash
docker run -d --name juanfer_postgres -p 5433:5432 \
  -e POSTGRES_USER=juanferseg -e POSTGRES_PASSWORD=<ver backend/.env> -e POSTGRES_DB=juanfer_db \
  -v juanfer_postgres_data:/var/lib/postgresql/data \
  postgres:16-alpine
```
```bash
docker ps --format "{{.Names}}  {{.Status}}  {{.Ports}}"   # debe verse juanfer_postgres (healthy) en 5433
```
Migraciones y datos iniciales (desde `backend/`):
```bash
uv run alembic upgrade head          # aplica las migraciones
uv run alembic current               # debe mostrar 25bebc173ff7 (head)
uv run python -m scripts.seed_data   # datos iniciales (comando verificado 2026-10-29)
```
- El seed ya es completamente idempotente: todo es `ON CONFLICT ... DO NOTHING` (no hay ningún `DO UPDATE`, ni `DELETE`/`TRUNCATE`/`DROP`) — correrlo de más no duplica nada ni pisa ediciones hechas desde el admin. Necesita las tablas ya creadas.
- En Docker (ver sección 8), el contenedor del backend ya corre migraciones + este seed automáticamente al arrancar, solo si la base está vacía — no hace falta este paso a mano ahí.
- Crear una migración tras cambiar un modelo: `uv run alembic revision --autogenerate -m "mensaje"` (va en el mismo commit; revisar a mano el archivo; ver D-004 y D-008).
- Consola de la base: `docker exec -it juanfer_postgres psql -U juanferseg -d juanfer_db` (en Git Bash puede requerir `winpty` delante).
- Respaldo antes de un `downgrade` (hacerlo en Git Bash, no en PowerShell, que corrompe la salida binaria): `docker exec juanfer_postgres pg_dump -U juanferseg -d juanfer_db -Fc > respaldo-$(date +%F).dump`. Guardar el archivo fuera del repo.
- Tests (desde `backend/`): `uv run pytest`. Son contra la DB de desarrollo real (no hay DB de test separada); `tests/conftest.py` envuelve cada test en un SAVEPOINT que se revierte al final, incluso con los `db.commit()` internos de los servicios — no deja datos.

## 5. Ejecución en local
```bash
(cd backend && uv run uvicorn app.main:app --reload)   # http://localhost:8000  (documentación en /docs)
(cd frontend && npm run dev)                           # puerto de Vite, 5173 por defecto [SUPUESTO]
```
El frontend llama al backend directo, sin proxy. Rutas del backend bajo `/api/v1`; `/health` fuera de ese prefijo.
Usuario inicial: lo crea el seed. Las credenciales están en `backend/scripts/seed_data.py` y no se copian aquí.

## 6. Verificación (cómo sé que quedó bien)
Ninguna casilla está comprobada todavía.
- [ ] `docker ps` muestra `juanfer_postgres` en estado healthy.
- [ ] `curl http://localhost:8000/health` responde (el cuerpo esperado es [PENDIENTE]).
- [ ] `uv run alembic current` muestra `98500168c7d6 (head)`.
- [ ] `http://localhost:8000/docs` abre.
- [ ] `npm run lint` y `npm run build` sin errores (hoy sin comprobar).
- [ ] Puedo iniciar sesión en el front y abrir `/prospectos`.
- Pruebas automáticas: no existen en ninguno de los dos lados (DT-006).

## 7. Flujo de trabajo diario
Trabajo directo en `desarrollo` (D-003) → cambios con el flujo OEF+CAT de `CLAUDE.md` → `npm run lint` / `npm run build` en el front → commit `Tipo(Módulo): descripción` → push. Nunca editar en el servidor.

## 8. Despliegue
El `docker-compose.yml` y `nginx/nginx.conf` ya quedaron corregidos (2026-10-29): driver `psycopg` (no `asyncpg`, DT-001), Postgres del compose sin puerto publicado al host (DT-002), `client_max_body_size 20M` en nginx (DT-004), `proxy_pass` sin "/" final para no recortar `/api/` (DT-010). Probado de punta a punta con `docker compose up` real (credenciales de prueba, nunca las reales): `/health`, `/` y una ruta real bajo `/api/v1/` responden correctamente a través de nginx.

**Primer arranque del backend (automático):** el contenedor corre `scripts/entrypoint.sh` en vez de levantar `uvicorn` directo — aplica `alembic upgrade head` (siempre; no hace nada si ya está en head) y después `scripts/entrypoint_seed_if_empty.py`, que solo siembra los datos iniciales (catálogos, roles, permisos, usuarios base) si la tabla `rol` está vacía. En despliegues posteriores o reinicios del contenedor, migra igual pero omite el seed — probado reiniciando el contenedor contra la misma base y confirmando que no duplica nada.

Falta por decidir y hacer: variables de entorno en el VPS (copiar `.env.example` de la raíz y `backend/.env.example`) y el flujo real de build/publish de las imágenes (DT-005, pendiente de elegir estrategia — manual, CI/CD, Dokploy). Nunca editar en el servidor.

## 9. Problemas frecuentes
| Síntoma | Causa probable | Solución |
|---|---|---|
| `error during connect ... dockerDesktopLinuxEngine` | Docker Desktop apagado | Encenderlo y esperar a que arranque. |
| `psql` no se reconoce | No hay `psql` en Windows | Usar `docker exec ... psql` o pgAdmin. |
| `python3` no se reconoce | En Windows el comando es `python` | Usar `python` (o `uv run python`). |
| Un parche da `PATTERN NOT FOUND` | CRLF frente a LF o acentos mal leídos (DT-008) | Abrir con `encoding='utf-8', newline=''` e inspeccionar con `repr()`. |
| Rutas con `/` dentro de `docker exec` salen alteradas en Git Bash | Git Bash convierte rutas | Anteponer `MSYS_NO_PATHCONV=1` al comando. |
| Acentos como `Ã¡` en PowerShell 5.1 | Es la consola, no el archivo | Ignorar o usar Git Bash. |
| El server levanta pero falla al ejecutar tras la última migración | Error conocido, causa sin confirmar | Capturar el traceback (ver `ESTADO.md`). |
| El front no muestra iconos | Sin internet, por el CDN de iconos | Conectarse a internet. |
| El front no llega al backend | Backend apagado o `VITE_API_URL` incorrecta | Comprobar `/health` y la variable. |

## 10. Para agregar un módulo nuevo
Los pasos salen de la estructura que se ve en el repo; no se han ejecutado como receta [SUPUESTO].
1. Backend: modelo en `app/models/<dominio>/`, registrado en `app/models/__init__.py`; migración (sección 4); schema en `app/schemas/`; service en `app/services/`; router en `app/routers/` incluido en `app/main.py` con prefijo `/api/v1`.
2. Frontend: `src/api/<modulo>.js`, `src/pages/<modulo>/` con su `.jsx` y su `.css`, ruta en `src/router/AppRouter.jsx` y entrada de menú en `Sidebar.jsx`. Solo tokens de `global.css`, máximo 1000 líneas por archivo, responsive.
3. Documentación: `docs/modulos/<modulo>.md` y una fila en la tabla de módulos de `docs/ARQUITECTURA.md`.
