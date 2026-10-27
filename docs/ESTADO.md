# Estado
Actualizado por /cierre — 2026-10-27 (primer estado, escrito durante el arranque de gobierno)

## Siguiente paso (UNO, concreto)
Reproducir el error de runtime y pegar el traceback completo: encender Docker Desktop, comprobar que `juanfer_postgres` esté arriba (puerto 5433), y desde `backend/` correr `uv run uvicorn app.main:app --reload`; llamar al endpoint que falla y copiar el traceback entero. Resultado esperado: el traceback real, más la salida de `uv run alembic current` y `uv run alembic heads`, para decidir si la causa es el desfase entre modelos y tablas o es otra. No se rediseña nada antes de tener esto.

## Última sesión
- Hecho: estructura de gobierno del proyecto. Entrevista completa (Fase 0), propuesta aprobada (Fase 1) y creados `CLAUDE.md`, `docs/PROPOSITO.md`, `docs/REQUISITOS.md`, `docs/ROADMAP.md`, `docs/DEUDA.md`, `docs/DECISIONES.md`, `docs/ARQUITECTURA.md`, `docs/GUIA.md`, `backend/.env.example`, `frontend/.env.example`, `.claude/commands/cierre.md` y este archivo. No se escribió código de producto.
- Verificado con: lectura del output de los comandos que ejecutó el usuario; sin tests ni ejecución del sistema.
- Commits: `Docs(Gobierno): Agregar contrato de trabajo, documentos vivos y comando /cierre` en `desarrollo`, ya con push (hash: [PENDIENTE]).

## Bloqueos / esperando mi respuesta
- Traceback del error de runtime (siguiente paso).
- Segundo commit con las correcciones de despliegue (Dokploy aún no conectado) y de la condición de D-008.
- Probar `/cierre` una vez en seco antes de confiar en él.
- Abiertas, de `docs/REQUISITOS.md`: estructura real de los 17 formularios, si una respuesta se vincula a un prospecto o cliente o puede ser anónima, qué catálogos edita el panel, formato de importación Excel/JSON, texto de autorización de datos (habeas data), umbral del límite de envíos, dominio de correo para Resend, anchos de prueba para responsive.
- Condición de D-008 resuelta: no hay otro entorno ni despliegue hecho (confirmado por el usuario). Pendiente antes del `downgrade`: `pg_dump` y saber si hay formularios o respuestas cargados (los 17) en la DB local: [PENDIENTE]. El usuario recuerda haber ejecutado el seed, que carga los catálogos de formularios (sin contar filas).

## Contexto que se pierde si no se escribe
- **Hipótesis sin confirmar:** que el error de runtime lo causa el modelo de datos. Solo se sabe que el server levanta y falla al ejecutar, tras la última migración. El usuario cree que rediseñar el modelo lo estabiliza; se verifica con el traceback.
- **Shell:** Claude Code debe usar Git Bash (`C:\Program Files\Git\bin\bash.exe`), no el `bash` de WSL. En los parches, `python` (no `python3`) y `open(..., encoding='utf-8', newline='')`.
- **Docker y DB local:** la DB que usa el `.env` es el contenedor `juanfer_postgres` (puerto 5433, base `juanfer_db`, usuario `juanferseg`), que no está definido en el repo (cómo se creó: [PENDIENTE]). Los contenedores `juanfer_db`, `juanfer_backend`, `juanfer_frontend` y `juanfer_nginx` del compose están detenidos desde hace meses y no se usan. No hay `psql` en Windows: usar `docker exec juanfer_postgres psql ...` o pgAdmin.
- **Modelo de formularios (D-D, sin decidir):** inclinación hacia un híbrido (columnas relacionales para lo consultable, JSONB para la definición y los valores, respuestas atadas a una versión inmutable). Es `[SUPUESTO]` hasta leer los 17 formularios y los modelos actuales. Alternativas: tablas normalizadas, o todo en JSONB.
- **Decisiones:** D-001 a D-008 en `docs/DECISIONES.md`. Sigue sin decidir el modelo de datos de formularios (D-D).
- **Seed:** `backend/scripts/seed_data.py` importa `app.models.formularios.constantes` (códigos de tipo de catálogo, estado de formulario, tipo de pregunta y estado de respuesta) y escribe con SQL crudo en una transacción manual. Si el modelo o esas constantes cambian bajo D-008, el seed puede romperse: revisarlo en el hito 1. Es casi idempotente: la mayoría es `ON CONFLICT DO NOTHING`, salvo un `DO UPDATE` por `id` (línea 70) que sobrescribe esa fila; no hay DELETE, TRUNCATE ni DROP. Tiene `if __name__ == "__main__"` (línea 286); el comando exacto, probablemente `uv run python -m scripts.seed_data` desde `backend/`, no está verificado. Si es así, tras un `downgrade` + `upgrade` el seed repone los catálogos; si los 17 formularios están en el seed: [PENDIENTE].
- **Tamaños del front (recuento del 2026-10-27):** el `.js`/`.jsx` más grande es `PolizaForm.jsx` con 783 líneas; ninguno pasa de 1000. `AdminCatalogos.jsx` mide menos de 205 líneas.
- **Front en local:** `vite.config.js` no define proxy; el front llama al backend directo (`VITE_API_URL`, por defecto `http://localhost:8000`). Al restringir CORS (DT-011) hay que permitir el origen del servidor de desarrollo de Vite. Bootstrap Icons se carga por CDN (jsdelivr, v1.11.3) desde `index.html`; sin internet no hay iconos. Cómo se cargan DM Sans e IBM Plex Sans: [PENDIENTE].
- **Front:** `frontend/src/pages/admin/` ya contiene `AdminCatalogos.jsx` (ruta `/admin/catalogos`, solo ADMIN; su alcance frente a RF-012 no se ha leído); `src/dashboard/` está vacía. `global.css` tiene los tokens. El mecanismo del modo oscuro (`ThemeContext.jsx`) no está confirmado. Bootstrap Icons no está en `package.json`; se carga por otra vía sin verificar.
- **Despliegue:** diferido a propósito. nginx recorta el prefijo (`/api/x` llega al backend como `/x`). Los hallazgos están en `DEUDA.md` (DT-001 a DT-005).
- **Migraciones:** 5 archivos en cadena lineal (head `98500168c7d6`, la de formularios). Las 4 anteriores son intocables; la de formularios se reescribe con `downgrade` bajo D-008, tras el traceback y un `pg_dump`.
- **Consola:** PowerShell 5.1 muestra mal los acentos de archivos UTF-8 (`Ã¡`); es de la consola, no de los archivos.

## Archivos tocados (no confirmados en commit)
Subidos en el primer commit. Las correcciones de CLAUDE.md, ARQUITECTURA, DECISIONES, DEUDA y este archivo esperan el segundo commit:
- `CLAUDE.md`
- `docs/PROPOSITO.md`
- `docs/REQUISITOS.md`
- `docs/ROADMAP.md`
- `docs/DEUDA.md`
- `docs/ESTADO.md`
- `docs/DECISIONES.md`
- `docs/ARQUITECTURA.md`
- `docs/GUIA.md`
- `backend/.env.example`
- `frontend/.env.example`
- `.claude/commands/cierre.md` (se versiona: `.claude/commands/` no va en `.gitignore`, decidido el 2026-10-27)
