# Estado
Actualizado manualmente (sin skill /cierre disponible en este entorno) — 2026-10-28

## Siguiente paso (UNO, concreto)
Probar con un formulario real, de punta a punta, que toda la información quede guardada sin errores (crear en el admin, publicar, diligenciar por la URL pública, confirmar la respuesta y el Cliente creado/reusado en la DB). Mientras eso no se confirme, el ítem 3 del roadmap sigue abierto aunque el front ya esté funcionalmente completo.

## Última sesión
- Hecho (frontend de formularios, ítem 3 del roadmap, construido paso a paso):
  1. `AdminCatalogos.jsx` ampliado para cubrir TODOS los catálogos de la DB (no solo el genérico): tabs con `CatalogoGenerico` (catalogo_tipo/valor) y un componente reusable `CatalogoLegado` para los catálogos existentes (estados_poliza, aseguradoras, productos, ramos, tipos_documento, estados_prospecto). CRUD admin de `estados_prospecto` agregado en backend para esto (schemas/services/router nuevos, sin borrado duro, igual criterio que DT-017).
  2. `Formularios.jsx` (listado, crear, publicar, copiar URL, eliminar) y `FormularioBuilder.jsx` (727 líneas): preguntas como tarjetas siempre editables al estilo Microsoft Forms, grupos repetibles, branching por pregunta tipo "opción" (salto a otra pregunta o a otra página/sección, o fin del formulario), vínculo de preguntas a campos del Cliente (`CAMPOS_CLIENTE`) con tipo de dato forzado y bloqueado, "Tipo de documento" sincronizado contra el catálogo real en vez de texto libre, código interno de la pregunta ahora de solo lectura (ya no editable, para no romper saltos condicionales).
  3. `FormularioPublico.jsx`: vista pública paginada por secciones (como MS Forms), con preguntas condicionales (ocultas hasta que su pregunta controladora responde la opción correcta, reactivo a cambios) resuelto con el modelo `controladoPor`.
  4. `Toast.jsx`/`ConfirmDialog.jsx` (componentes compartidos nuevos): eliminan todo uso de `alert()` y `window.confirm()` del navegador en las pantallas nuevas.
  5. Backend: dos bugs reales encontrados con datos reales de un formulario de prueba y corregidos — `_extraer_campos_cliente` pisaba el valor correcto de un campo (ej. `numero_documento`) con `None` de una alternativa de branching vacía; `_validar_basico` no excluía preguntas tipo "sección" (encabezados sin valor) ni las alternativas de branching inactivas, rechazando envíos correctos. Ambos corregidos con un nuevo helper `_preguntas_controladas` que replica en el servidor el mismo criterio de visibilidad del front (defensa en profundidad). 2 tests de regresión nuevos.
- Verificado con:
  - `uv run pytest` desde `backend/` → 17 passed (eran 12 al cierre del ítem 2).
  - `npx eslint` y `npm run build` sin errores tras cada cambio de frontend.
  - Los dos bugs de backend se confirmaron primero contra datos reales de un formulario de prueba del usuario (payload real, DB real vía `docker exec juanfer_postgres psql`) antes de escribir el fix.
  - **No** se probó todavía un formulario real completo de punta a punta sin intervención manual de depuración — eso es justamente el siguiente paso.
- Commits: ninguno todavía. Todo el trabajo de esta sesión (frontend completo de formularios + fixes de backend) sigue sin commitear desde `5b434e2`.

## Bloqueos / esperando mi respuesta
- Ninguno. El usuario dejó 3 notas explícitas para no perder de vista en próximas sesiones (ver ROADMAP.md "Siguiente" y DEUDA.md): importación masiva de formularios, prueba end-to-end con formulario real, pulido continuo de UI/UX. Ninguna bloquea seguir trabajando.

## Contexto que se pierde si no se escribe
- **El modelo de branching pasó por 3 iteraciones reales**, no fue un diseño de una sola vez: (1) salto simple pregunta→pregunta con "continuar flujo natural" dejaba reaparecer preguntas ya saltadas; (2) "saltar cursor entre origen y destino" no cubría alternativas posicionadas DESPUÉS del destino; (3) el modelo final, `controladoPor`, es un filtro reactivo: cualquier pregunta que sea destino de alguna opción de otra pregunta tipo "opción" queda oculta por defecto y solo se muestra si la respuesta actual de su controladora coincide con el valor que apunta a ella. Este modelo final se implementó IDÉNTICO en front (`FormularioPublico.jsx`) y back (`_preguntas_controladas` en `formulario_respuesta.py`) a propósito, para que el backend nunca dependa de que el front mandó bien los datos.
- **El vínculo pregunta↔campo del Cliente ahora fuerza y bloquea el tipo de dato** (`CAMPOS_CLIENTE` con `tipoForzado` por campo) porque el usuario marcó como "inaceptable" que el admin pudiera, por ejemplo, mapear "nombre" a tipo "número". No se generan preguntas automáticamente (se consideró y se descartó explícitamente): el admin sigue creando la pregunta, pero al vincularla a un campo del Cliente el tipo queda fijo.
- **El código interno de cada pregunta (`codigo`) ya no es editable** porque es la clave literal que usan el branching y el JSON de `respuestas`; el usuario lo señaló como un riesgo de "error desconocido" dependiente del admin, no una decisión de diseño previa.
- **Los 4 campos NOT NULL de `Cliente`** (`tipo_documento_id`, `numero_documento`, `nombre_completo`, `celular`) siguen siendo, por D-009, obligatorios de mapear en todo formulario público — esto es relevante para el futuro importador masivo (ver ROADMAP "Siguiente"): cada formulario importado necesita esas 4 preguntas mapeadas y requeridas, o el endpoint público rechazará toda respuesta con "faltan_campos_cliente".

## Archivos tocados (no confirmados en commit)
- `backend/app/routers/catalogo.py`, `backend/app/schemas/catalogo.py`, `backend/app/services/catalogo.py` (CRUD admin de `estados_prospecto`)
- `backend/app/schemas/formulario_respuesta.py` (`cliente_nombre`/`cliente_documento` en el read)
- `backend/app/services/formulario_respuesta.py` (fixes de `_extraer_campos_cliente` y `_validar_basico`, nuevo `_preguntas_controladas`)
- `backend/tests/test_formulario_publico.py` (2 tests nuevos), `backend/tests/test_estado_prospecto_admin.py` (nuevo)
- `frontend/src/api/catalogos.js` (CRUD admin de catálogos legado), `frontend/src/api/formularios.js` (nuevo)
- `frontend/src/components/ConfirmDialog.jsx`/`.css`, `frontend/src/components/Toast.jsx`/`.css` (nuevos)
- `frontend/src/components/layout/Sidebar.jsx`, `frontend/src/router/AppRouter.jsx` (rutas y nav de formularios)
- `frontend/src/pages/admin/AdminCatalogos.jsx`/`.css` (todos los catálogos)
- `frontend/src/pages/formularios/` (nuevo: `Formularios.jsx`, `FormularioBuilder.jsx` + `.css`)
- `frontend/src/pages/publico/` (nuevo: `FormularioPublico.jsx` + `.css`)
- `docs/DEUDA.md`, `docs/ROADMAP.md` (actualizados esta sesión)
