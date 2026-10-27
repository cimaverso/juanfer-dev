# Decisiones
Solo decisiones difíciles de revertir o no obvias. Formato corto.

## D-001 — SQLAlchemy síncrono con psycopg 3 (2026-10-27)
- **Contexto:** el código ya usa `create_engine` síncrono en `app/core/db.py` y en `alembic/env.py`; `pyproject.toml` solo trae `psycopg[binary]`.
- **Decisión:** mantener SQLAlchemy 2 síncrono con `psycopg` 3.
- **Alternativas descartadas:** async con `asyncpg`: es el estilo natural de FastAPI, pero obliga a migrar todos los servicios sin ganancia medible para el volumen de este sistema.
- **Consecuencias / costo asumido:** no declarar endpoints `async def` que llamen a la DB síncrona, porque bloquean el event loop. Cuántos existen hoy no está verificado (ver DT-009).
- **Revisar si:** hay carga concurrente que el modelo síncrono no soporte.
- **Estado:** vigente

## D-002 — Reutilizar la estructura existente del frontend (2026-10-27)
- **Contexto:** el front ya tiene su organización (`api/`, `components/`, `context/`, `pages/<modulo>/`, `router/`, `styles/`) y sus tokens en `src/styles/global.css`.
- **Decisión:** seguir esa estructura y reutilizar lo que ya existe, en lugar de introducir una nueva. Los tokens se siguen leyendo de `global.css`; no se crea el `tokens.css` de la plantilla.
- **Alternativas descartadas:** crear `tokens.css` y mover los tokens: duplicaría la fuente de verdad y chocaría con los nombres actuales (`--color-azul` frente a `--color-primary`), sin ganancia funcional.
- **Consecuencias / costo asumido:** el código nuevo hereda las convenciones actuales, incluidos los 98 hex sueltos del código existente (DT-007), que se pagan al tocar cada archivo.
- **Revisar si:** la estructura actual impide algo que el panel nuevo necesite.
- **Estado:** vigente

## D-003 — Trabajo directo en `desarrollo` (2026-10-27)
- **Contexto:** hay un solo desarrollador. Existen las ramas `desarrollo` y `main`.
- **Decisión:** trabajar directo en `desarrollo`; `main` no se toca sin pedirlo.
- **Alternativas descartadas:** ramas cortas `feat/...`: aíslan el modelo de datos del resto, pero con una sola persona el overhead no se paga.
- **Consecuencias / costo asumido:** sin aislamiento, un cambio a medias queda en `desarrollo`.
- **Revisar si:** entra otra persona, o hay un cambio riesgoso que convenga aislar.
- **Estado:** vigente

## D-004 — Estrategia de migraciones (2026-10-27)
- **Contexto:** 5 migraciones Alembic en cadena lineal (head `98500168c7d6`, la de formularios); hay cambios de modelo pendientes para formularios.
- **Decisión:** una migración por feature con `alembic revision --autogenerate`, revisión manual del archivo generado, y prueba de `upgrade head` y `downgrade -1` en una base descartable. Las 4 anteriores a la de formularios no se editan; la de formularios se rige por D-008.
- **Alternativas descartadas:** migraciones escritas a mano: más seguras pero más lentas.
- **Consecuencias / costo asumido:** autogenerate omite cambios de enums, defaults de servidor y tipos JSONB; por eso la revisión manual y el `downgrade` son obligatorios.
- **Revisar si:** una migración autogenerada llega a producción con un error.
- **Estado:** vigente

## D-005 — Desarrollo local primero, despliegue después (2026-10-27)
- **Contexto:** el repo tiene `docker-compose.yml`, nginx y despliegue con Dokploy, pero hay hallazgos pendientes (DT-001 a DT-005).
- **Decisión:** desarrollar y probar en local con comandos nativos de cada stack (`uv`, `alembic`, `npm`). El despliegue con compose, nginx y Dokploy se aborda cuando todo esté listo y testeado.
- **Alternativas descartadas:** validar todo desde ya dentro de Docker Compose: reproduce producción, pero obliga a arreglar antes esos hallazgos.
- **Consecuencias / costo asumido:** el compose no se ejecuta durante el desarrollo, así que puede divergir del código sin que se note hasta el despliegue.
- **Revisar si:** se acerca el primer despliegue.
- **Estado:** vigente

## D-006 — Git Bash para el flujo de parches (2026-10-27)
- **Contexto:** el flujo OEF+CAT usa `grep`, `sed` y un heredoc de Python. El entorno es Windows con PowerShell 5.1, y el `bash` del sistema apunta a WSL.
- **Decisión:** usar Git Bash (`C:\Program Files\Git\bin\bash.exe`), con `python` y lectura y escritura UTF-8 con `newline=''`.
- **Alternativas descartadas:** WSL: más cercano al VPS, pero el repo está en `Desktop\` de Windows (I/O lento por `/mnt/c`) y Docker Desktop requiere integración. PowerShell con script Python: se pierden `grep` y `sed`.
- **Consecuencias / costo asumido:** la fuente de errores será CRLF frente a LF (ver DT-008).
- **Revisar si:** CRLF causa fallos de parche repetidos, o el repo se mueve a WSL.
- **Estado:** vigente

## D-007 — Correo de notificación con Resend (2026-10-27)
- **Contexto:** cada formulario enviado debe notificar por correo al dueño, con diseño cuidado.
- **Decisión:** usar Resend (confirmado por el usuario). Motivo de la elección: [PENDIENTE].
- **Alternativas descartadas:** [PENDIENTE]. No consta que se hayan evaluado otros proveedores.
- **Consecuencias / costo asumido:** Resend exige un dominio verificado (SPF/DKIM) para enviar desde el correo de la empresa; estado del dominio: [PENDIENTE]. El correo lleva datos personales a un tercero.
- **Revisar si:** el dominio no se puede verificar, o cambian el costo o los límites.
- **Estado:** vigente

## D-008 — Reescribir la migración de formularios con downgrade (2026-10-27)
- **Contexto:** la migración `98500168c7d6` (formularios, head) ya está en el commit de `desarrollo` y en la DB local, y su modelo debe corregirse (hito 1). El usuario trabaja solo.
- **Decisión:** en lugar de apilar una migración correctiva, hacer `downgrade` de esa migración, editarla y volver a aplicarla, para dejar una única migración de formularios. Las 4 anteriores siguen intocables. Antes: diagnosticar el error real (traceback), respaldar la DB con `pg_dump` y probar el ciclo en una base descartable.
- **Alternativas descartadas:** migración nueva encima que repare el esquema: segura en cualquier entorno, pero deja una migración defectuosa y otra que la repara.
- **Consecuencias / costo asumido:** el `downgrade` borra las tablas de formularios y sus datos; si el `downgrade()` nunca se probó, puede fallar. Que el commit ya esté en el repo no lo impide: el cambio entra como un commit normal, sin reescribir historia ni forzar push.
- **Revisar si:** algún entorno distinto de la DB local (por ejemplo un Dokploy de `desarrollo`) tiene aplicada `98500168c7d6`; ahí habría que hacer también el `downgrade`, o pasar a la migración nueva. Verificación: [PENDIENTE].
- **Estado:** vigente, condicionada a esa verificación
