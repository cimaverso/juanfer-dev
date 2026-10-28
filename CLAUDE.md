# Juanfer Seguros — Contrato de trabajo

> Propósito: sistema interno de trazabilidad y seguimiento de clientes y prospectos con sus pólizas, más formularios públicos por URL para asegurados e interesados. Detalle en docs/PROPOSITO.md.

## Al iniciar CADA sesión (obligatorio)
1. Lee `docs/ESTADO.md` (dónde quedamos y el siguiente paso).
2. Lee `docs/ROADMAP.md` solo la sección "Ahora".
3. Lee `docs/DEUDA.md` solo las entradas abiertas que toquen los archivos de hoy.
4. Lee el documento del módulo en el que se trabaja (`docs/modulos/`, cuando exista); no cargues los demás. Consulta `docs/GUIA.md` solo si hay que instalar, configurar, correr o desplegar.
5. Resume en 5 líneas lo entendido y pregunta si vamos con el siguiente paso de ESTADO.md.

## Método de trabajo (no negociable)
- Un paso a la vez. Propón, espera mi confirmación explícita, ejecuta, muestra resultado, espera de nuevo. Claude Code ejecuta los comandos y el usuario aprueba cada uno antes de que corra; no se encadenan comandos con efectos sin aprobación.
- Antes de cambiar un archivo: ubícalo (`grep -n 'patron'`), lee el bloque (`sed -n 'X,Yp'`), usa `cat` si el bloque es grande o hay duda de duplicados.
- Patch (workflow OEF+CAT): ÚNICO método, script Python con heredoc desde Git Bash:
  ```
  python << 'EOF'
  ruta = 'ruta/archivo'
  content = open(ruta, encoding='utf-8', newline='').read()
  old = """bloque exacto"""
  new = """bloque nuevo"""
  if old not in content:
      print("PATTERN NOT FOUND")
  else:
      open(ruta, 'w', encoding='utf-8', newline='').write(content.replace(old, new, 1))
      print("OK")
  EOF
  ```
  Verificar después con `sed -n` o `grep`. Si da PATTERN NOT FOUND: es problema de contenido (acentos, CRLF/LF, espacios), nunca de línea; inspeccionar con `repr()`.
- Cambios mínimos y verificables; tras cada cambio, verifica (lint, build, grep o ejecución).
- Si el cambio tiene trade-offs: alternativas y el mejor argumento en contra de tu recomendación ANTES de recomendar.
- Señala deuda técnica y riesgos antes de que ocurran; regístralos en docs/DEUDA.md (pregunta primero).
- Distingue siempre: hecho / inferencia / opinión. Si falta información, pídela y explica por qué.
- Estilo: directo, sin rodeos.

## Entorno
- Windows. Shell de Claude Code: **Git Bash** (`C:\Program Files\Git\bin\bash.exe`), NO el `bash` de WSL. Usar `python`, no `python3`. Venv: `.venv/Scripts`.
- Postgres corre en Docker Desktop: contenedor `juanfer_postgres` (puerto 5433, base `juanfer_db`, usuario `juanferseg`); pgAdmin aparte. No hay `psql` en Windows: usar `docker exec juanfer_postgres psql -U juanferseg -d juanfer_db` o pgAdmin. Los contenedores `juanfer_*` del compose están detenidos y no se usan en desarrollo. Si Docker Desktop está apagado, los comandos de DB fallan.
- Fines de línea: `core.autocrlf=true`, sin `.gitattributes` (ver DEUDA).

## Stack
FastAPI (Python ≥3.12, `uv`) · SQLAlchemy 2 **síncrono** + `psycopg` 3 + Alembic · PostgreSQL 16 · React 19 + Vite 8 en JavaScript (sin TypeScript), **npm** · Docker/nginx/Dokploy: [PENDIENTE], fuera de alcance por ahora.

## Reglas del repositorio
- Trabajo directo en `desarrollo` (único desarrollador). `main` existe; no se toca sin pedirlo.
- Flujo actual: local con comandos nativos de cada stack. Despliegue (compose, nginx, Dokploy): [PENDIENTE], se aborda cuando todo esté listo y testeado. Nunca editar en el servidor.
- Todo cambio de modelo SQLAlchemy va con su migración Alembic en el MISMO commit.
- **Migraciones intocables:** las 4 anteriores a la de formularios (`1862ff089733`, `871cc6d526bd`, `07f706ae928e`, `0122a2ce8ea1`); solo se agregan nuevas. La de formularios (`98500168c7d6`, head) puede reescribirse con `downgrade` y edición solo bajo D-008: respaldar antes con `pg_dump` (hoy no existe otro entorno donde esté aplicada). Revisar a mano toda migración autogenerada y probar `upgrade head` y `downgrade -1` en una base descartable.
- Commits: `Tipo(Módulo): descripción` (ej. `Feat(Formulario): ...`, `Fix(Poliza): ...`).
- No mezclar gestores: backend `uv`, frontend `npm`.
- Secretos: nunca en el repo; solo variables de entorno. Nunca imprimir valores de `.env`; comparar solo nombres.
- Carpetas ajenas (no tocar): ninguna definida [PENDIENTE].

## Reglas del frontend
- Archivos `.js` y `.jsx`: máximo 1000 líneas.
- Colores, tipografía, espacios, radios, sombras y transiciones: SOLO tokens de `frontend/src/styles/global.css` (`--color-*`, `--estado-*`, `--alerta-*`, `--font-*`, `--space-*`, `--text-*`...). Nunca hex sueltos en código nuevo. Las pantallas nuevas deben funcionar en modo claro y oscuro (`ThemeContext`).
- Respetar la organización actual: `api/`, `components/`, `context/`, `pages/<modulo>/`, `router/`, `styles/`. Cada página con su `.jsx` y su `.css`.
- Iconos: Bootstrap Icons (`bi bi-*`).
- Responsive 100% (RNF-013): toda pantalla nueva nace responsive (móvil primero), sin scroll horizontal. Las existentes se auditan después; no se rediseñan de paso.

## Comandos habituales
Backend (desde `backend/`): `uv sync` · `uv run uvicorn app.main:app --reload` · `uv run alembic revision --autogenerate -m "msg"` · `uv run alembic upgrade head` · `uv run alembic downgrade -1`
Frontend (desde `frontend/`): `npm install` · `npm run dev` · `npm run lint` · `npm run build`
Tests backend: `uv run pytest` (desde `backend/`). Frontend: [PENDIENTE] (ver docs/DEUDA.md).

## Documentos vivos
| Archivo | Para qué | Quién lo actualiza |
|---|---|---|
| docs/ESTADO.md | Dónde quedamos | /cierre |
| docs/DECISIONES.md | Por qué se decidió | /cierre (solo decisiones nuevas) |
| docs/ROADMAP.md | Qué sigue y por qué | Yo, con tu propuesta |
| docs/REQUISITOS.md | Qué debe cumplir el sistema | Yo, con tu propuesta |
| docs/DEUDA.md | Atajos y riesgos asumidos | /cierre propone, yo apruebo |
| docs/ARQUITECTURA.md | Cómo está construido | Al cambiar la estructura |
| docs/GUIA.md | Instalar, configurar, ejecutar, desplegar | Al cambiar dependencias, variables o despliegue |

## Fuera de alcance (por ahora)
Integraciones con servicios externos (salvo Resend, en "Siguiente"), pagos y facturación, app móvil, portal del cliente, despliegue y producción (nginx/compose/Dokploy).
