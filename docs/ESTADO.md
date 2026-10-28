# Estado
Actualizado por /cierre — 2026-10-27

## Siguiente paso (UNO, concreto)
Empezar el ítem 2 del roadmap (backend de formularios y catálogos). Primer sub-paso: decidir el formato de entrada para importar los 17 formularios reales (ya no es solo "Excel o JSON" genérico de RF-013 — hay 17 JSON concretos exportados de Microsoft Forms en `DOCUMENTACION\Juanfer Seguros\FORMULARIOS`, con el inventario ya contrastado contra el modelo). Resultado esperado: un plan de mapeo JSON→modelo (qué `Question.*` va a qué `tipo_id`, cómo se resuelven los `#1..#4` a `FormularioGrupoPregunta`, qué `codigo` estable se asigna a cada pregunta) antes de escribir el importador.

## Última sesión
- Hecho:
  1. Reproducido el error de runtime con el traceback real: `Cliente`/`Poliza`/`Cotizacion` no tenían la relationship inversa `formulario_respuestas` que `FormularioRespuesta` esperaba vía `back_populates` → `sqlalchemy.exc.InvalidRequestError: Mapper 'Mapper[Cliente(cliente)]' has no property 'formulario_respuestas'`. No era desfase de migración: agregada la relationship en los 3 modelos.
  2. Contrastado el modelo de formularios contra un inventario real de los 17 JSON (1518 preguntas, 161 `ColumnGroup`, hasta 109 repeticiones de pregunta por formulario, 247 con salto condicional, 51 Choice no simple, 29 con "Otro"). Confirma que el híbrido relacional+JSONB (D-D) los soporta sin tabla por formulario.
  3. Corregidos 2 huecos de diseño, reescribiendo la migración `98500168c7d6` (permitido, no es de las 4 intocables):
     - `Formulario.version_activa` (int suelto, sin integridad referencial) → `version_activa_id` (FK real a `formulario_version.id`, `ON DELETE SET NULL`).
     - Agregada `Formulario.token_publico` (UUID único, default `gen_random_uuid()`) para la futura URL pública (antes no existía ningún identificador no adivinable).
  4. Fijadas 3 convenciones de diseño sin cambio de esquema (en `constantes.py` y el comentario de `formulario_pregunta.py`): `configuracion.multiple`/`allow_other` para Choice no simple y opción "Otro"; `BranchingCodigos.FIN = "__fin__"` para salto al final del formulario; nuevo valor de catálogo `calificacion` en `formulario_pregunta_tipo` (para `Question.Rating`, 12 casos en el inventario).
- Verificado con:
  - Traceback real pegado por el usuario (antes y después del fix).
  - `configure_mappers()` sin error tras cada tanda de cambios.
  - `uv run alembic downgrade -1` → edición de la migración → `uv run alembic upgrade head`, sin error; `alembic current` y `alembic heads` coinciden en `98500168c7d6`.
  - `\d formulario` en psql muestra `version_activa_id` con su FK y `token_publico` con su UNIQUE.
  - Catálogo `formulario_pregunta_tipo` con 9 valores tras repoblar con el seed (incluye `calificacion`).
  - El usuario levantó el server en su terminal y confirmó `POST /api/v1/auth/login` → 200 OK, antes y después de los cambios de esquema.
  - No hay pruebas automáticas (DT-006, sigue sin existir pytest).
- Commits: ninguno esta sesión; todo sigue sin commitear (ver "Archivos tocados").

## Bloqueos / esperando mi respuesta
- Formato de entrada para importar los 17 formularios (ver "Siguiente paso"): decidir si el importador parte de los JSON de Microsoft Forms directamente o de un formato intermedio.
- `backend/backups/juanfer_db_20261027_191351.sql` (pg_dump hecho antes del downgrade de hoy, por la regla D-008): conservarlo hasta confirmar que todo quedó estable; no se commiteó.
- Bug de `.gitignore` encontrado (ver abajo): `backend/backups/` no se está ignorando de verdad. Pendiente de tu OK para corregirlo (propuesto en DEUDA).
- `CLAUDE.md` tiene un cambio sin commitear que no se originó en esta sesión (ya estaba así al empezar) — confirmar si es intencional antes de commitear nada que lo incluya.
- Siguen abiertas, de `docs/REQUISITOS.md`: si una respuesta se vincula a un prospecto/cliente o puede ser anónima, qué catálogos edita el panel, texto de habeas data, umbral de envíos, dominio Resend, anchos de prueba responsive.

## Contexto que se pierde si no se escribe
- **El error de runtime NO era el modelo de datos de formularios en el sentido temido:** no había desfase entre migraciones y tablas (coincidían en `98500168c7d6` desde el inicio de la sesión). Era una relationship de SQLAlchemy incompleta (`back_populates` sin su contraparte). Las 4 migraciones anteriores a la de formularios nunca estuvieron en duda.
- **D-D resuelto:** el modelo híbrido (relacional para lo consultable: `FormularioPregunta`/`FormularioGrupoPregunta` con `codigo` estable, `orden` numérico, `requerida`; JSONB para configuración/branching/validaciones/respuestas; `FormularioVersion` como snapshot inmutable) queda confirmado contra los 17 formularios reales, no solo como hipótesis. Falta registrar esto en DECISIONES.md (propuesto, ver abajo).
- **Inventario de los 17 formularios:** recibido como `docs` externo (`inventario_forms.md`, generado desde los JSON en `DOCUMENTACION\Juanfer Seguros\FORMULARIOS`; los JSON son la fuente de verdad, no el .md). El contraste contra el modelo se hizo a mano en esta sesión, leyendo los 5 modelos de `app/models/formularios/`; no hay script automatizado de validación.
- **Convenciones nuevas que el futuro importador debe respetar:** `FormularioPregunta.configuracion` ahora documenta `multiple`, `allow_other` y `goto_codigo: "__fin__"` (constante `BranchingCodigos.FIN`); el catálogo `formulario_pregunta_tipo` tiene 9 valores (se agregó `calificacion`).
- **Migración de formularios editable, usada de nuevo:** se repitió el ciclo `pg_dump` → `downgrade -1` → editar → `upgrade head` sobre `98500168c7d6`, que sigue siendo la única no intocable. La tabla `formulario` seguía en 0 filas antes de esta sesión (los 17 formularios no estaban cargados, al contrario de lo que el usuario recordaba del seed). Las 4 anteriores (`1862ff089733`, `871cc6d526bd`, `07f706ae928e`, `0122a2ce8ea1`) no se tocaron.
- **Seed:** sigue siendo casi idempotente (`ON CONFLICT DO NOTHING`); se le agregó una fila (`calificacion`). Comando confirmado y funcionando: `uv run python -m scripts.seed_data` desde `backend/`, pero en Windows necesita `PYTHONIOENCODING=utf-8` por delante — la consola (cp1252) no puede imprimir los emojis del script (`UnicodeEncodeError`). No se tocó el script para quitar los emojis; es deuda de consola, no del código (propuesto en DEUDA).
- **Bug de `.gitignore`:** `backend/.gitignore` línea 56 tiene el patrón `backend/backups/`. Por estar dentro de `backend/.gitignore`, ese patrón se resuelve relativo a `backend/`, así que en realidad busca ignorar `backend/backups/backend/backups/` — no ignora la carpeta real. `git status` la muestra como untracked. Debería ser `backups/` a secas. No corregido (fuera del alcance de archivos que /cierre puede tocar sin permiso).
- **`CLAUDE.md` con una diferencia sin commitear que no viene de esta sesión:** la frase sobre quién ejecuta los comandos en "Método de trabajo" ya estaba cambiada al iniciar esta sesión. No se tocó ni se debe commitear junto con el resto sin que el usuario confirme si es intencional.
- **Backend corriendo:** el servidor lo levanta y prueba el usuario en su propia terminal (Git Bash, venv `backend\.venv`), nunca Claude Code directamente. Confirmado 200 OK en login después de todos los cambios de esta sesión.
- **Tamaños del front, consola de Windows, Docker/DB local, despliegue diferido:** sin cambios respecto a lo ya registrado (ver sesión anterior); esta sesión no tocó frontend.

## Archivos tocados (no confirmados en commit)
- `backend/alembic/versions/98500168c7d6_v3_agregar_tablas_para_formularios.py` (reescrita, no es una migración nueva)
- `backend/app/models/formularios/constantes.py`
- `backend/app/models/formularios/formulario.py`
- `backend/app/models/formularios/formulario_pregunta.py` (solo comentario, sin cambio de columnas)
- `backend/app/models/formularios/formulario_version.py`
- `backend/app/models/modulos_negocio/cotizacion.py`
- `backend/app/models/modulos_negocio/poliza.py`
- `backend/app/models/usuarios_clientes/cliente.py`
- `backend/scripts/seed_data.py`
- `backend/backups/juanfer_db_20261027_191351.sql` (no versionado; ver nota del bug de `.gitignore` arriba)
- `CLAUDE.md` (diferencia preexistente, no de esta sesión — no tocar sin confirmar con el usuario)
