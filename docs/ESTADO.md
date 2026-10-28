# Estado
Actualizado manualmente (sin skill /cierre disponible en este entorno) — 2026-10-28

## Siguiente paso (UNO, concreto)
Probar con un formulario real, de punta a punta, que toda la información quede guardada sin errores (crear en el admin, publicar, diligenciar por la URL pública, confirmar la respuesta y el Cliente creado/reusado en la DB). Mientras eso no se confirme, el ítem 3 del roadmap sigue abierto aunque el front ya esté funcionalmente completo. Esto sigue pendiente desde antes de esta sesión; hoy no se tocó.

## Última sesión (2026-10-28, backend sobre el módulo de formularios — sin tocar front todavía)
- Hecho, paso a paso con aprobación:
  1. **`Formulario.categoria_id`** (NOT NULL, FK a `catalogo_valor`, catálogo nuevo `formulario_categoria`: `cotizacion`/`expedicion`) — clasificación de negocio, independiente del `estado_id` de publicación que ya existía. Migración `751a7703f081` (catálogo + columna + backfill a `cotizacion` en los 2 formularios reales existentes + NOT NULL + FK). Seed actualizado en paralelo. Sin default en creación: el admin debe elegir la categoría sí o sí (`"categoria_invalida"` si no existe el código).
  2. **Filtros en `GET /formularios`**: `categoria_codigo`, `estado_codigo`, `titulo` (parcial), `fecha_desde`/`fecha_hasta`.
  3. **Métricas por formulario**: `GET /formularios/{id}/metricas` — total de respuestas, completadas vs en progreso, tasa de completitud, serie diaria. Set básico, ampliable.
  4. **`FormularioRespuesta.prospecto_id`** (nullable, FK a `prospecto`, migración `38441a12ff62`) — sin uso real hoy (el flujo público siempre resuelve a Cliente), agregado por pedido explícito del usuario pese a que se le señaló que es deuda especulativa (ver DEUDA DT-020).
  5. **Cliente/Prospecto ↔ Formularios respondidos**: `Cliente.total_formularios_respondidos` (property calculada sobre la relación ya existente, sin columna nueva) + `GET /clientes/{id}/formularios-respondidos`; mismo patrón completo para Prospecto (`ProspectoRead.total_formularios_respondidos`, `GET /prospectos/{id}/formularios-respondidos`), también sin consumidor real hoy.
  6. **Bug real encontrado y corregido**: `ClienteProspectoRead` (usado por `GET /clientes/`) exigía `correo`/`ocupacion`/`ciudad` como obligatorios pese a ser nullable en el modelo; un cliente creado por el formulario público sin esos campos mapeados tronaba el endpoint con 500. Corregido a `Optional[str]`.
- Verificado con:
  - `uv run pytest` desde `backend/` → 24 passed (eran 17 al cierre del frontend de formularios).
  - `upgrade head` y `downgrade -1` probados para las 2 migraciones nuevas (`751a7703f081`, `38441a12ff62`) contra `juanfer_postgres` (única DB real hoy).
  - Import de `app.main` sin errores tras cada cambio.
- **Todo backend a propósito**: el usuario pidió explícitamente dejar el front para después y "alistar" el backend ya. Queda documentado en docs/modulos/formularios.md qué pantallas faltan y dónde van (filtros/categoría en Formularios.jsx y builder, métricas en el admin de formularios, `/clientes/{id}/formularios-respondidos` consumido desde Pólizas).
- Commits: ninguno todavía. Todo lo de esta sesión (lo del frontend de formularios ya existente desde antes + todo lo de hoy) sigue sin commitear desde `5b434e2`.

## Bloqueos / esperando mi respuesta
- Ninguno.

## Contexto que se pierde si no se escribe
- **`estado_id` (publicación) y `categoria_id` (negocio) son conceptos distintos a propósito** — se evitó nombrarlos igual ("estado") para no repetir el error de confundir ciclo de vida de publicación con clasificación de negocio.
- **`prospecto_id` en `FormularioRespuesta` y su endpoint en Prospecto son deuda especulativa asumida a sabiendas** (DT-020): se señaló al usuario que viola la regla del propio CLAUDE.md de no construir para requisitos hipotéticos, y decidió seguir igual porque "mejor tenerla lista desde ya". Si nunca aparece un caso real, es candidato a limpieza en una auditoría futura.
- **El listado de filtros de Formulario resuelve código→id antes de filtrar** (vía `CatalogoService.get_valor_id`), no con joins — más simple y consistente con el patrón ya usado en preguntas/grupos. Un código inválido en el filtro simplemente no devuelve resultados (no es un error 400), porque es un filtro de lista, no una escritura.

## Archivos tocados (no confirmados en commit, además de los ya listados en el cierre anterior del ítem 3)
- `backend/app/models/formularios/constantes.py` (`FORMULARIO_CATEGORIA`, `FormularioCategoriaCodigos`)
- `backend/app/models/formularios/formulario.py` (`categoria_id` + relationship)
- `backend/app/models/formularios/formulario_respuesta.py` (`prospecto_id` + relationship)
- `backend/app/models/modulos_negocio/prospecto.py` (`formulario_respuestas`, `total_formularios_respondidos`)
- `backend/app/models/usuarios_clientes/cliente.py` (`total_formularios_respondidos`)
- `backend/alembic/versions/751a7703f081_...py`, `backend/alembic/versions/38441a12ff62_...py` (nuevas)
- `backend/scripts/seed_data.py` (catálogo `formulario_categoria`)
- `backend/app/schemas/formulario.py`, `backend/app/schemas/formulario_respuesta.py`, `backend/app/schemas/cliente.py`, `backend/app/schemas/prospecto.py`
- `backend/app/services/formulario.py` (filtros, `categoria_id`), `backend/app/services/formulario_respuesta.py` (`metricas`, `listar_por_cliente`, `listar_por_prospecto`)
- `backend/app/routers/formulario.py`, `backend/app/routers/cliente.py`, `backend/app/routers/prospecto.py`
- `backend/tests/test_formulario_builder.py`, `backend/tests/test_formulario_publico.py`
- `docs/DEUDA.md` (DT-020 + fix de `ClienteProspectoRead` en "Pagadas"), `docs/modulos/formularios.md`
