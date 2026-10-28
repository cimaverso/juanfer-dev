# Deuda técnica
Una deuda no es "algo feo": es un atajo con costo e interés conocidos.

| ID | Tipo | Descripción | Impacto si se ignora | Costo de pagarla (S/M/L) | Disparador de pago | Estado |
|---|---|---|---|---|---|---|
| DT-001 | infra | `docker-compose.yml` fuerza `DATABASE_URL` con `postgresql+asyncpg://`, pero el código es síncrono y `asyncpg` no está en `pyproject.toml`. Debe ser `postgresql+psycopg://`. | El backend en contenedor no arranca. | S | Hito "Despliegue a producción" | abierta |
| DT-002 | seguridad | El servicio `db` del compose publica `5434:5432` al host. | En el VPS expone la base de datos. | S | Hito "Despliegue a producción" | abierta |
| DT-003 | infra | Credenciales de DB en dos lugares: el compose interpola `${DB_USER}`, `${DB_PASSWORD}` y `${DB_NAME}` desde la raíz, y el backend lee `backend/.env`. No hay `.env` en la raíz. | Desincronización y arranque con variables vacías. | S | Hito "Despliegue a producción" | abierta |
| DT-004 | infra | nginx sin `client_max_body_size` (1 MB por defecto). (Inferencia: depende de qué proxy quede delante.) | Las importaciones masivas grandes fallan con 413. | S | Hito "Despliegue a producción" | abierta |
| DT-005 | infra | Flujo manual `scp dist/ → docker cp → nginx -s reload`: parche sobre el contenedor que se pierde en el siguiente redeploy y no encaja con este compose (el `dist` vive en el contenedor `frontend`, no en nginx). | Frontend desactualizado tras un redeploy. | M | Hito "Despliegue a producción" | abierta |
| DT-006 | pruebas | No hay pytest ni script de test en backend ni frontend. | Regresiones sin detectar al crecer el código. | M | Ítem 2 de "Ahora" (backend). Frontend: [PENDIENTE] | abierta |
| DT-007 | diseño | 98 hex sueltos fuera de `global.css`: ProspectoDetalle.css 33, Prospectos.css 29, Prospectos.jsx 13, ProspectoForm.css 12, ProspectoDetalle.jsx 6, Dashboard.css 3, Sidebar.css 1, ImportarPolizas.css 1. | Rompe el modo oscuro y la regla de tokens. | M | Al tocar cada uno de esos archivos | abierta |
| DT-008 | infra | `core.autocrlf=true` y no existe `.gitattributes`. | Fines de línea mixtos y falsos PATTERN NOT FOUND en el flujo de parches. (Impacto inferido.) | S | Primer PATTERN NOT FOUND por CRLF, o antes del despliegue | abierta |
| DT-009 | diseño | Hay 1 `async def` en `app/routers` (conteo del 2026-10-27), sin identificar; comprobar que no llame a la DB síncrona. `app/db/base.py` (4 líneas) parece la `Base` declarativa y no un duplicado de `core/db.py` (inferencia). | Un `async def` que llame a la DB síncrona bloquea el event loop. | S | Ítem 2 de "Ahora" (al tocar los routers) | abierta |
| DT-010 | infra | nginx recorta `/api/` (`proxy_pass http://backend:8000/`), pero el backend monta sus rutas bajo `/api/v1`: una petición `/api/v1/x` llegaría al backend como `/v1/x`. (Inferencia: `VITE_API_URL` podría apuntar al backend sin pasar por nginx.) | El front no funciona detrás de nginx (404). | S | Hito "Despliegue a producción" | abierta |
| DT-011 | seguridad | CORS con `allow_origins=["*"]` en `app/main.py`. | Cualquier origen puede llamar a la API desde un navegador; pesa más con endpoints públicos. | S | Antes de publicar la primera URL de formulario | abierta |
| DT-012 | infra | El contenedor Postgres local `juanfer_postgres` (puerto 5433), que usa `backend/.env`, no está definido en el repo; el compose define otro (`juanfer_db`, puerto 5434). | Nadie más, ni otra máquina, puede reproducir el entorno local; `docs/GUIA.md` no se puede ejecutar desde cero. | S | Antes de que otra persona o máquina levante el proyecto | abierta |
| DT-013 | infra | `backend/.gitignore:56` tiene el patrón `backend/backups/`, pero al estar dentro de `backend/.gitignore` se resuelve relativo a `backend/`, así que no ignora la carpeta real (`git status` la muestra como untracked). | Un `pg_dump` con datos reales podría terminar commiteado por accidente. | S | Próximo `git add` que la incluya sin querer | abierta |
| DT-014 | infra | `backend/scripts/seed_data.py` imprime emojis (`🌱`, `✅`) que rompen en consola Windows con codepage cp1252 (`UnicodeEncodeError`); hay que anteponer `PYTHONIOENCODING=utf-8` para correrlo. | El seed "falla" en consolas por defecto de Windows, no por el código. | S | Al escribir `docs/GUIA.md` para otra máquina, o si vuelve a molestar | abierta |

Tipos de disparador válidos: fecha · hito del roadmap · incidente · tamaño (ej. más de 1000 filas).
Una deuda sin disparador es un deseo; se mueve a ROADMAP "Después" o se descarta.

## Pagadas
| ID | Fecha | Cómo se resolvió |
|---|---|---|
