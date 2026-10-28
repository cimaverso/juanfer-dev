# Módulo: Formularios
Creado: 2026-10-27 (al abrir el ítem 2 del roadmap). Ver docs/DECISIONES.md D-D para el porqué del modelo de datos.

## Qué es
Formularios dinámicos (builder + versionado + respuestas) que el admin diseña en el panel y que un asegurado o interesado diligencia por una URL pública, sin login. Reemplaza el flujo actual por Microsoft Forms (17 formularios reales ya inventariados).

## Regla de negocio clave
Toda persona que diligencia y envía un formulario público **pasa a ser `Cliente`**. No existe respuesta anónima ni vinculada solo a un prospecto. Al completar una respuesta:
1. Se busca `Cliente` por `numero_documento` (único en el modelo).
2. Si existe, se reutiliza. Si no, se crea uno nuevo con `responsable_id = NULL` (sin asesor asignado hasta que alguien lo tome).

**Implicación para el builder:** el grupo "Tomador" de cada formulario debe marcar como `requerida=true` y con `mapea_a` las 4 columnas NOT NULL de `Cliente`: `tipo_documento_id`, `numero_documento`, `nombre_completo`, `celular`. Si falta alguna, la creación del cliente falla a mitad del flujo público. Esto se resuelve al construir el importador de los 17 formularios (pendiente), no en el backend genérico.

## Modelo de datos (ya migrado, migración `98500168c7d6`, head)
Híbrido relacional + JSONB — detalle y alternativas descartadas en D-D.

- **`Formulario`** — cabecera. `estado_id` → `catalogo_valor` (tipo `formulario_estado`: `borrador`/`activo`/`archivado`). `version_activa_id` → FK real a `formulario_version.id` (`SET NULL`). `token_publico` (UUID único, no adivinable, para la URL pública).
- **`FormularioVersion`** — snapshot inmutable (`estructura` JSONB) generado al publicar. Las respuestas quedan ancladas a la versión con la que el cliente interactuó.
- **`FormularioGrupoPregunta`** — bloque repetible (ej. "Asegurado"), define `minimo_repeticiones`/`maximo_repeticiones` y a qué `entidad_destino` mapea cada repetición.
- **`FormularioPregunta`** — una fila por pregunta o sección. `codigo` estable (clave del branching y de `mapea_a`). `tipo_id` → `catalogo_valor` (tipo `formulario_pregunta_tipo`: `texto`/`numero`/`email`/`telefono`/`fecha`/`opcion`/`nps`/`seccion`/`calificacion`). `configuracion` JSONB: `choices`, `multiple`, `allow_other`, `branching` (con `goto_codigo` y la constante reservada `BranchingCodigos.FIN = "__fin__"` para saltar al final), `validacion`.
- **`FormularioRespuesta`** — una fila por envío. `respuestas` JSONB (incluye arrays para grupos repetibles). `estado_id` → `catalogo_valor` (tipo `formulario_respuesta_estado`: `en_progreso`/`completada`). FKs opcionales a `cliente`/`poliza`/`cotizacion` (según la regla de negocio de arriba, `cliente_id` siempre se resuelve al completar).

Catálogos y constantes en `app/models/formularios/constantes.py` (`CatalogoTipoCodigos`, `FormularioEstadoCodigos`, `PreguntaTipoCodigos`, `BranchingCodigos`, `RespuestaEstadoCodigos`) — son solo para comparar en código; la fuente de verdad de qué valores existen sigue siendo la tabla `catalogo_valor`, editable por el admin.

## Backend — estado actual (ítem 2 del roadmap, en curso)
| Capa | Archivo | Contenido |
|---|---|---|
| Helper genérico | `app/services/catalogo.py` → `CatalogoService.get_valor_id(db, tipo_codigo, valor_codigo)` | Resuelve id de `catalogo_valor` por código, ej. `('formulario_estado', 'borrador')`. Lo usan los servicios de negocio para no depender de ids fijos. |
| Schemas | `app/schemas/formulario.py` | `FormularioCreate`, `FormularioUpdate`, `FormularioRead` (con `estado` anidado vía `EstadoFormularioRead`). |
| Service | `app/services/formulario.py` | `FormularioService`: `listar`, `obtener`, `crear` (asigna `estado_id='borrador'` por defecto), `actualizar`, `eliminar` (devuelve `"tiene_respuestas"` si choca con el `ON DELETE RESTRICT` de `formulario_respuesta`, en vez de dejar que explote un 500). |
| Service (grupos) | `app/services/formulario.py` → `FormularioGrupoPreguntaService` | `listar`/`obtener`/`crear`/`actualizar`/`eliminar` de `FormularioGrupoPregunta`. `crear`/`actualizar` devuelven `"codigo_duplicado"` si choca con `uq_grupo_pregunta_codigo`. `orden` se autoasigna (`max(orden)+1` dentro del formulario) si no se envía, para soportar drag&drop sin renumerar. |
| Service (preguntas) | `app/services/formulario.py` → `FormularioPreguntaService` | Igual patrón para `FormularioPregunta`. Recibe `tipo_codigo` (string, ej. `"texto"`) y lo resuelve a `tipo_id` vía el helper de catálogo (`"tipo_invalido"` si no existe). Valida que `grupo_id`, si se envía, pertenezca al mismo `formulario_id` (`"grupo_no_pertenece"`) — el FK no lo garantiza por sí solo. |
| Router | `app/routers/formulario.py` | CRUD bajo `/api/v1/formularios`, más builder anidado: `GET`/`POST /{formulario_id}/grupos`, `PUT`/`DELETE /grupos/{id}`; mismo patrón para `/preguntas`. `GET` requiere sesión; el resto requiere admin (`require_admin`). Registrado en `app/main.py`. |

| Service (versiones) | `app/services/formulario.py` → `FormularioVersionService` | `publicar(db, formulario_id)`: construye el snapshot de grupos+preguntas (usa `tipo_codigo`, no `tipo_id`, para no depender de ids internos de `catalogo_valor`; `orden` se guarda como string porque `Decimal` no es serializable a JSON), autoincrementa `numero_version`, mueve `version_activa_id` y pasa `estado_id` a `activo`. `listar` devuelve el historial de versiones. |
| Router | | `POST /{id}/publicar`, `GET /{id}/versiones` (admin / sesión respectivamente). |

| Schemas | `app/schemas/formulario_respuesta.py` | `FormularioPublicoRead` (vista pública: título, descripción, configuración, `estructura` de la versión activa), `FormularioRespuestaCreate`, `FormularioRespuestaRead`. |
| Service | `app/services/formulario_respuesta.py` → `FormularioRespuestaService` | `crear(db, token_publico, data, ip, user_agent)`: resuelve `Cliente` por `numero_documento` (reusa o crea con `responsable_id=None`), dedupe por documento+formulario (`"ya_respondio"`), límite por IP (`ENVIOS_MAX_POR_IP=5` / `VENTANA_MINUTOS_POR_IP=60`, constantes ajustables en el mismo archivo, sin infraestructura aparte), validación básica (requerida + tipo simple) **solo de preguntas sueltas** (ver DT-015). `listar` para la vista admin. |
| Router (público) | `app/routers/formulario_publico.py` | `GET /public/formularios/{token_publico}` (vista pública, sin auth) y `POST /public/formularios/{token_publico}/respuestas` (sin auth). Registrado en `app/main.py`. |
| Router (admin) | `app/routers/formulario.py` | `GET /{id}/respuestas` (requiere sesión). |

**Catálogos de este módulo, ya editables desde el admin:** `formulario_estado`, `formulario_pregunta_tipo`, `formulario_respuesta_estado` se gestionan vía el CRUD genérico de `catalogo_tipo`/`catalogo_valor` (`GET/POST /api/v1/catalogos/tipos`, `GET/POST /api/v1/catalogos/tipos/{codigo}/valores`, `PUT /api/v1/catalogos/valores/{id}`) — no tienen rutas propias dentro de `formulario.py`. Ver docs/DEUDA.md "Pagadas" DT-017: no hay borrado duro de valores a propósito, solo `activo=false`.

**Todavía no existe:** importador de los 17 JSON de Microsoft Forms (ítem "Siguiente" del roadmap, no bloquea el ítem 2).

## Pruebas automáticas
`backend/tests/` (pytest, agregado 2026-10-27 — ver DEUDA "Pagadas" DT-006 parte backend): `test_catalogo_generico.py`, `test_formulario_builder.py`, `test_formulario_publico.py`. `conftest.py` aísla cada test en un SAVEPOINT que se revierte al final, para que los `db.commit()` internos de los servicios no dejen datos reales (la razón concreta: ver DT-017, se rompió un valor real del catálogo con una prueba manual sin este aislamiento). `admin_headers` hace login real contra el usuario sembrado por `scripts/seed_data.py` (`dani@juanfer.com` / `123456`), no un mock. Correr con `uv run pytest` desde `backend/`.

### Deuda abierta por este paso
- **DT-015:** la validación del endpoint público no cubre campo por campo las preguntas dentro de un grupo repetible (arrays en el JSONB), solo las preguntas sueltas.
- **DT-016:** el límite por IP usa `request.client.host` directo, sin `X-Forwarded-For`; se rompe si el backend queda detrás de un proxy (ver DT-010).

### Bug encontrado y corregido (al implementar publicación)
`Formulario.version_activa` (relationship a `FormularioVersion`) necesitaba `post_update=True`. Sin eso, borrar un formulario que ya tiene `version_activa_id` seteado falla con `Circular dependency detected`: SQLAlchemy no puede decidir el orden de los `DELETE` entre `formulario` (que apunta a `formulario_version` vía `version_activa_id`) y `formulario_version` (que apunta de vuelta a `formulario` vía `formulario_id`, con cascada). Encontrado con un smoke test real contra la DB (crear → publicar dos veces → eliminar), no con los chequeos de import/`configure_mappers()`, que no ejecutan ningún `DELETE`.

## Preguntas abiertas (ver docs/REQUISITOS.md)
- Qué catálogos de formularios puede editar el panel (más allá de `catalogo_valor` genérico).
- Texto de habeas data (Ley 1581 de 2012, RNF-005).
- Umbral de envíos del endpoint público (anti-spam/rate limit).
- Dominio Resend verificado y destinatario del correo de notificación (D-007).
- Anchos de prueba responsive para la vista pública (hito 3).
- Formato de entrada del importador de los 17 formularios (JSON de Microsoft Forms directo vs. formato intermedio) — ítem "Siguiente" del roadmap, no bloquea el ítem 2.

## Riesgos / deuda relacionados
- DT-009: verificar que ningún router de formularios termine siendo `async def` llamando a la DB síncrona.
- DT-011: CORS abierto (`*`) pesa más una vez exista el endpoint público.
