# Estado
Actualizado por /cierre — 2026-10-27

## Siguiente paso (UNO, concreto)
Empezar el ítem 3 del roadmap (frontend: panel admin y vista pública de formularios). Primer sub-paso: leer la estructura actual del front (`pages/`, `api/`, `router/`, tokens de `global.css`) y la pantalla de catálogos ya existente (`pages/admin/AdminCatalogos.jsx`, aún sin leer) para decidir cómo encaja el builder de formularios (listar/crear/editar formulario, grupos, preguntas, publicar) antes de escribir ninguna pantalla. No existe todavía `docs/modulos/` para frontend; crear uno si el módulo lo justifica.

## Última sesión
- Hecho (backend de formularios, ítem 2 del roadmap, construido paso a paso y verificado contra la DB real en cada paso):
  1. Helper genérico `CatalogoService.get_valor_id(db, tipo_codigo, valor_codigo)` para resolver ids de `catalogo_valor` por código.
  2. CRUD admin de `Formulario` (`schemas/services/routers/formulario.py`): crear/listar/obtener/editar/eliminar bajo `/api/v1/formularios`.
  3. Builder: CRUD de `FormularioGrupoPregunta` y `FormularioPregunta` (orden autoasignado, código único por formulario, `tipo_codigo` resuelto contra el catálogo, validación de que `grupo_id` pertenezca al mismo formulario).
  4. Publicación: `FormularioVersionService.publicar()` genera el snapshot (`FormularioVersion.estructura`), mueve `version_activa_id` y pasa el estado a `activo`.
  5. Endpoint público (`/api/v1/public/formularios/{token_publico}`, sin auth) + `FormularioRespuestaService`: regla de negocio nueva (D-009) — toda respuesta pública crea o reusa un `Cliente` por `numero_documento`; dedupe por documento+formulario; rate limit por IP (5/hora); validación básica (requerida+tipo) solo de preguntas sueltas (D-011).
  6. CRUD admin del catálogo genérico `catalogo_tipo`/`catalogo_valor` bajo `/api/v1/catalogos` (crear tipo, listar/crear/editar valores) — los 3 catálogos de formularios y cualquier catálogo futuro quedan editables desde el front sin deploy. Sin borrado duro a propósito (D-010).
  7. `backend/tests/` con pytest (12 tests): catálogo genérico, builder completo + publicación, endpoint público con las reglas de negocio. `conftest.py` aísla cada test en un SAVEPOINT que revierte al final, incluso con los `db.commit()` internos de los servicios.
  8. `docs/modulos/formularios.md` creado (primera vez, lo anticipaba ARQUITECTURA.md).
- Dos bugs reales encontrados y corregidos en el camino (no solo "notas de implementación"):
  - `Formulario.version_activa` necesitaba `post_update=True`: sin eso, borrar un formulario ya publicado fallaba con `Circular dependency detected` (ciclo de FKs entre `formulario.version_activa_id` y `formulario_version.formulario_id`). Encontrado con un smoke test real contra la DB, no con `configure_mappers()`.
  - El `eliminar_valor` original de `catalogo_valor` (ya no existe, ver D-010) solo estaba protegido por el `ON DELETE RESTRICT` de las FKs, que no protege un valor "default" sin filas referenciándolo todavía. Se comprobó borrando por accidente el `'borrador'` real de `formulario_estado` en una prueba manual sin aislamiento transaccional; restaurado al toque con el seed, y corregido quitando la capacidad de borrado duro del todo (de ahí nació `tests/conftest.py` con SAVEPOINT, para que no vuelva a pasar).
- Verificado con:
  - Cada paso probado contra la DB real (`juanfer_postgres`, Docker) con scripts manuales desechables antes de pasar al siguiente, y limpiado después (confirmado con `docker exec ... psql` que no quedaron residuos).
  - `uv run alembic heads` → un solo head (`98500168c7d6`), sin migración nueva (los cambios de esta sesión son de código/ORM, no de esquema).
  - `uv run pytest` desde `backend/` → 12 passed.
  - No se abrió `/docs` (Swagger) a mano por mí; falta esa verificación manual del usuario para considerar completo el criterio de salida del ítem 2.
- Commits: 2 esta sesión (`d52dfc9` fix de `.gitignore`, y el commit de documentación de gobierno ya existente antes de empezar). El resto del trabajo de hoy (backend de formularios completo) sigue sin commitear — ver "Archivos tocados".

## Bloqueos / esperando mi respuesta
- Ninguno nuevo. El ítem 2 del roadmap quedó cerrado (el usuario decidió cerrarlo sin probar `/docs` a mano, confiando en los 12 pytest). `docs/REQUISITOS.md` se deja sin tocar por ahora a propósito — las 3 preguntas que esta sesión resolvió (vínculo a Cliente D-009, catálogos editables, umbral de envíos D-011) siguen listadas ahí como "abiertas" aunque ya tienen respuesta en `DECISIONES.md`; falta limpiarlas en una próxima sesión.
- Sigue sin existir importador de los 17 formularios reales ("Siguiente" del roadmap, no bloquea frontend).
- `docs/DEUDA.md` y `docs/GUIA.md` ya quedaron al día con el OK del usuario durante la sesión (DT-006 acotada a frontend, DT-015, DT-016, DT-017 pagada; línea de `uv run pytest` agregada a GUIA.md).

## Contexto que se pierde si no se escribe
- **El backend de formularios se construyó en 5 pasos explícitos** (helper de catálogo → CRUD de Formulario → builder de grupos/preguntas → publicación/versionado → endpoint público + Cliente), cada uno propuesto, aprobado y verificado antes de seguir al siguiente. El catálogo genérico (paso 6) se agregó después, a pedido explícito del usuario, porque sin él el admin no tenía forma de editar los catálogos de formularios desde la API.
- **La regla de negocio "toda respuesta pública crea o reusa un Cliente" (D-009) la dio el usuario, no fue una inferencia mía.** Tiene una implicación directa para el futuro importador de los 17 formularios: el grupo "Tomador" de cada uno debe mapear (`mapea_a`) y marcar `requerida=true` las 4 columnas NOT NULL de `Cliente`.
- **El rate limit (5 envíos/IP/hora) y el modo de envío (un solo POST, sin autosave) se decidieron con el usuario mediante una pregunta explícita (`AskUserQuestion`), no son un valor arbitrario mío** — están en `services/formulario_respuesta.py` como constantes nombradas, ajustables sin cambio de esquema.
- **La validación server-side del endpoint público es deliberadamente incompleta:** solo cubre preguntas sueltas (fuera de grupos repetibles como "Asegurados"). Esto se acordó explícitamente con el usuario como recorte de alcance, no es un olvido (ver DT-015 y D-011).
- **Incidente real durante la sesión:** una prueba manual sin aislamiento transaccional borró de la DB de desarrollo el valor real `'borrador'` del catálogo `formulario_estado` (porque el `ON DELETE RESTRICT` no protege valores sin referencias en el momento del borrado). Se restauró al toque con el seed. La respuesta no fue "tener más cuidado la próxima vez": se quitó la capacidad de borrado duro del código (D-010) y se construyó pytest con aislamiento por SAVEPOINT (`tests/conftest.py`) para que ningún test futuro pueda repetir el daño, aunque los servicios comiteen internamente.
- **Todo el trabajo de hoy pasa pytest (12/12) pero no se probó en Swagger (`/docs`) a mano.** Es una verificación distinta (HTTP real contra uvicorn, no `TestClient`); de bajo riesgo pero no idéntica.
- **Backend corriendo:** sigue siendo el usuario quien levanta el server en su propia terminal, nunca Claude Code directamente.

## Archivos tocados (no confirmados en commit)
- `CLAUDE.md` (línea de "Tests" en Comandos habituales, actualizada para reflejar que ya existe pytest en backend)
- `backend/app/main.py` (routers de `formulario` y `formulario_publico` registrados)
- `backend/app/models/formularios/formulario.py` (fix `post_update=True` en la relación `version_activa`)
- `backend/app/routers/catalogo.py` (endpoints nuevos del catálogo genérico)
- `backend/app/routers/formulario.py` (nuevo)
- `backend/app/routers/formulario_publico.py` (nuevo)
- `backend/app/schemas/catalogo.py` (schemas nuevos del catálogo genérico)
- `backend/app/schemas/formulario.py` (nuevo)
- `backend/app/schemas/formulario_respuesta.py` (nuevo)
- `backend/app/services/catalogo.py` (helper genérico + CRUD de `catalogo_tipo`/`catalogo_valor`)
- `backend/app/services/formulario.py` (nuevo)
- `backend/app/services/formulario_respuesta.py` (nuevo)
- `backend/pyproject.toml` / `backend/uv.lock` (pytest + httpx como dev-deps, config de pytest)
- `backend/tests/` (nuevo: `conftest.py` + 3 archivos de test)
- `docs/ARQUITECTURA.md`, `docs/DEUDA.md`, `docs/GUIA.md`, `docs/DECISIONES.md` (actualizados esta sesión)
- `docs/modulos/formularios.md` (nuevo)
