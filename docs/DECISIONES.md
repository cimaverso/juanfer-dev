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
- **Contexto:** el repo tiene `docker-compose.yml` y nginx; se prevé desplegar con Dokploy, aún no conectado y sin ningún despliegue hecho. Hay hallazgos pendientes (DT-001 a DT-005).
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

## D-007 — Correo de notificación con Resend (2026-10-27, implementada y cerrada 2026-10-29)
- **Contexto:** cada formulario enviado debe notificar por correo al dueño, con diseño cuidado. El usuario ya tenía cuenta y API key de Resend; dominio propio aún no verificado.
- **Decisión:** usar Resend, llamada HTTP directa con `httpx` a su API REST (`app/services/resend_service.py`) en vez del SDK oficial — una sola llamada no lo justifica. Remitente: `onboarding@resend.dev` (el que Resend permite sin dominio verificado) por defecto, dinámico vía `RESEND_REMITENTE` en `.env` para cuando el cliente verifique su propio dominio. Destinatario también dinámico (`RESEND_CORREO`, hoy el correo del usuario, a futuro el del cliente) — nada de esto requiere redeploy ni tocar código, solo el `.env`. El envío se dispara con `BackgroundTasks` de FastAPI después de que la respuesta pública ya quedó persistida y confirmada (`db.commit()`): nunca bloquea ni puede tumbar esa persistencia, y un fallo de Resend nunca aparece como error de cara al usuario público.
- **Alternativas descartadas:** SDK oficial de `resend`: más superficie para una sola llamada. Cola de verdad (Celery/Redis u otro worker aparte): resolvería mejor la durabilidad ante un crash del proceso, pero es infraestructura nueva que no existe hoy y el despliegue (Docker/Dokploy) sigue [PENDIENTE] — se posterga hasta que haga falta de verdad.
- **Consecuencias / costo asumido:** el `BackgroundTask` deliberadamente NO reutiliza la sesión de DB de la request — recibe los datos ya en memoria, llama a Resend sin ninguna conexión del pool abierta (para no retenerla durante la espera de red bajo carga), y solo al final abre una sesión propia corta para marcar `correo_estado`/`correo_intentos`/`correo_error`/`correo_enviado_at` en `FormularioRespuesta` (migración `924f6a4adb55`). Si el proceso muere entre el commit de la respuesta y la ejecución del background task, ese correo queda sin rastro de intento; no hay reintento automático todavía (ver DT-032). El camino completo HTTP→background→UPDATE tampoco queda cubierto por pytest por diseño del aislamiento de tests (ver DT-033).
- **Revisar si:** el cliente verifica su propio dominio en Resend (cambiar `RESEND_REMITENTE`/`RESEND_CORREO` en `.env`, sin tocar código); o se acumulan correos en `pendiente`/`fallido` sin resolver.
- **Estado:** vigente

## D-008 — Reescribir la migración de formularios con downgrade (2026-10-27)
- **Contexto:** la migración `98500168c7d6` (formularios, head) ya está en el commit de `desarrollo` y en la DB local, y su modelo debe corregirse (hito 1). El usuario trabaja solo.
- **Decisión:** en lugar de apilar una migración correctiva, hacer `downgrade` de esa migración, editarla y volver a aplicarla, para dejar una única migración de formularios. Las 4 anteriores siguen intocables. Antes: diagnosticar el error real (traceback), respaldar la DB con `pg_dump` y probar el ciclo en una base descartable.
- **Alternativas descartadas:** migración nueva encima que repare el esquema: segura en cualquier entorno, pero deja una migración defectuosa y otra que la repara.
- **Consecuencias / costo asumido:** el `downgrade` borra las tablas de formularios y sus datos; si el `downgrade()` nunca se probó, puede fallar. Que el commit ya esté en el repo no lo impide: el cambio entra como un commit normal, sin reescribir historia ni forzar push.
- **Revisar si:** la migración llega a aplicarse fuera de la DB local (hoy no existe otro entorno ni se ha hecho un despliegue, confirmado por el usuario el 2026-10-27); desde ese momento, pasar a la migración nueva.
- **Estado:** vigente

## D-009 — Toda respuesta de formulario público crea o reusa un Cliente (2026-10-27)
- **Contexto:** quedaba abierto en REQUISITOS.md si una respuesta se vincula a un cliente/prospecto existente o puede ser anónima (bloqueaba RF-010/RF-011).
- **Decisión:** toda persona que diligencia y envía un formulario público pasa a ser `Cliente`. El servicio público resuelve por `numero_documento` (único): reusa el `Cliente` si existe, lo crea si no, con `responsable_id = NULL` hasta que un asesor lo tome. Nunca se guarda una respuesta anónima ni vinculada solo a un `Prospecto`.
- **Alternativas descartadas:** permitir respuesta anónima sin crear `Cliente`: más simple, pero no cumple el objetivo de negocio de capturar leads. Vincular a `Prospecto` en vez de `Cliente`: `Prospecto` es un estado de pipeline posterior, no el registro de identidad.
- **Consecuencias / costo asumido:** el grupo "Tomador" de cada formulario real debe mapear (`mapea_a`) las 4 columnas NOT NULL de `Cliente` (`tipo_documento`, `numero_documento`, `nombre_completo`, `celular`) y marcarlas `requerida=true`; si el importador de los 17 formularios no lo hace, la respuesta pública falla con 400.
- **Revisar si:** aparece un formulario real que legítimamente deba ser anónimo (ej. una encuesta sin identificar a la persona).
- **Estado:** vigente

## D-010 — `catalogo_valor` sin borrado duro, solo desactivación (2026-10-27)
- **Contexto:** al construir el CRUD admin del catálogo genérico, una prueba manual sin aislamiento transaccional borró de verdad el valor `'borrador'` de `formulario_estado`, porque el `ON DELETE RESTRICT` de las FKs solo protege un valor que YA tiene alguna fila referenciándolo; un valor "default" usado por código (`FormularioEstadoCodigos.BORRADOR`) puede no tener ninguna fila en un momento dado y seguir siendo indispensable.
- **Decisión:** no exponer ningún endpoint ni método de servicio para borrar un `catalogo_valor`. El admin solo lo desactiva (`activo=false`), como ya sugería el docstring original del modelo.
- **Alternativas descartadas:** permitir borrado duro protegido solo por el `RESTRICT` de la FK (es justo lo que falló). Bloquear el borrado comparando contra una lista de códigos "protegidos" en código: más complejo y sin garantía de estar completa.
- **Consecuencias / costo asumido:** un valor creado por error y nunca usado queda inactivo para siempre en la tabla en vez de poder borrarse; no se considera relevante dado el volumen esperado de catálogos.
- **Revisar si:** se necesita limpiar catálogos de prueba masivamente (se haría por SQL directo, no por la API).
- **Estado:** vigente

## D-011 — Alcance del endpoint público: envío único, dedupe + rate limit, validación básica (2026-10-27)
- **Contexto:** RNF-002/003 y varias preguntas abiertas de REQUISITOS.md (modo de envío, umbral de envíos, validación server-side) no tenían respuesta.
- **Decisión (confirmada por el usuario):** el envío es un solo POST con todas las respuestas completas (sin autosave progresivo). El límite de envíos combina dedupe por documento (una respuesta `completada` por `numero_documento` y formulario) y rate limit por IP (5 envíos por hora, constantes ajustables en `services/formulario_respuesta.py`, sin infraestructura aparte). La validación server-side cubre requerida + tipo simple, pero SOLO para preguntas sueltas (fuera de un grupo repetible); las preguntas dentro de un grupo repetible (arrays en el JSONB) no se validan campo por campo (ver DT-015).
- **Alternativas descartadas:** autosave progresivo (soporta recuperar un formulario a medio llenar, pero más superficie sin auth que proteger); motor de validación completo (branching/regex por tipo) en esta etapa (ya identificado como trabajo aparte, ver D-D).
- **Consecuencias / costo asumido:** el rate limit por IP usa `request.client.host` directo, sin `X-Forwarded-For` (ver DT-016, se rompe detrás de un proxy); los grupos repetibles pueden llegar con datos incompletos o mal tipados sin que el backend lo note.
- **Revisar si:** aparece abuso real del endpoint público, o se construye el motor de validación completo.
- **Estado:** vigente salvo el dedupe por documento, retirado — ver D-013 (2026-10-29).

## D-012 — Restablecer contraseña: código de un solo uso, no clave temporal aplicada (2026-10-28)
- **Contexto:** al pagar DT-023, propuse que el ADMIN generara una clave temporal ya aplicada (usable para login) que forzara un cambio obligatorio en el siguiente inicio de sesión. El usuario corrigió el diseño antes de implementarlo.
- **Decisión:** el ADMIN genera un código de un solo uso (8 caracteres, `secrets.choice`, hasheado en `Usuario.reset_codigo_hash`, expira en 60 min) que entrega al usuario por un canal aparte. El código **no sirve para iniciar sesión**: el usuario lo cambia por su propia contraseña nueva en una pantalla pública dedicada (`/restablecer-password`, 2 pasos: validar código → definir contraseña), sin tocar `password_hash` hasta que el usuario define la clave final.
- **Alternativas descartadas:** clave temporal aplicada directo a `password_hash` con flag `debe_cambiar_password` (mi propuesta inicial): funciona, pero exige forzar el cambio en el flujo normal de login (lógica adicional en `authenticate_user` y en `Login.jsx`) y deja una ventana donde la clave temporal es una credencial real y utilizable.
- **Consecuencias / costo asumido:** una pantalla pública nueva (`RestablecerPassword.jsx`) y 2 endpoints públicos (`/auth/validar-codigo-reset`, `/auth/reset-password`) en vez de reutilizar el flujo de login existente.
- **Revisar si:** se necesita un flujo de "olvidé mi contraseña" autoservicio (hoy solo lo dispara el ADMIN, no hay autoservicio para el usuario).
- **Estado:** vigente

## D-013 — Se retira el dedupe por documento del endpoint público (2026-10-29)
- **Contexto:** D-011 (2026-10-27) fijó que el endpoint público rechaza (409) una segunda respuesta `completada` del mismo `numero_documento` para el mismo formulario. Al importar y probar los 17 formularios reales de MS Forms, el usuario determinó que esa regla no aplica al negocio real: un mismo Cliente puede diligenciar el mismo formulario varias veces (ej. comprar varios productos del mismo tipo).
- **Decisión:** se elimina por completo la validación de dedupe — `FormularioRespuestaService._ya_respondio` (y su uso en `crear`) y el manejo de `"ya_respondio"` en `app/routers/formulario_publico.py`. Un mismo documento puede generar N respuestas `completada` sobre el mismo formulario; cada envío sigue creando/reusando el mismo `Cliente` (D-009 no cambia). Test actualizado: `test_mismo_documento_puede_responder_otra_vez` (antes esperaba 409, ahora espera 201 en ambos envíos).
- **Alternativas descartadas:** mantener el dedupe pero con una ventana de tiempo (ej. no permitir la misma respuesta en menos de X minutos) — descartada por el usuario, sin pedirlo; no hay caso de uso real que la motive hoy.
- **Consecuencias / costo asumido:** nada impide hoy que alguien reenvíe el mismo formulario con el mismo documento repetidamente más allá del rate limit por IP (D-011); si eso se vuelve un problema real (ej. errores de doble clic del usuario público), hay que decidir un mecanismo distinto (ej. deduplicar por contenido+ventana corta, no por documento sin límite).
- **Revisar si:** aparece un caso real de envíos duplicados no intencionales que convenga filtrar.
- **Estado:** vigente

## D-014 — Varias preguntas de ubicación se concatenan, no se pisan (2026-10-29)
- **Contexto:** DT-030: algunos de los 17 formularios reales tienen DOS preguntas distintas mapeadas a `Cliente.ubicacion` ("Dirección completa" y "País, departamento y ciudad"). `_extraer_campos_cliente` trataba cualquier campo repetido igual que `numero_documento` (alternativa por tipo de documento, branching): solo una debía quedar, la última no vacía pisaba a la anterior — aquí perdía uno de los dos datos reales si el usuario diligenciaba ambas.
- **Decisión:** `ubicacion` tiene un tratamiento distinto al resto de campos: se concatenan TODAS las preguntas diligenciadas que mapeen a ese campo, en el orden en que aparecen en el formulario, separadas por coma, en un solo string (coincide con la columna `Text` sin estructura). Los demás campos (`numero_documento`, etc.) siguen con el criterio anterior (solo una alternativa real, una vacía no pisa la que sí llegó).
- **Alternativas descartadas:** separar en dos columnas (`direccion`/`ubicacion_general`): más preciso, pero `Cliente.ubicacion` ya es un campo libre sin estructura en todo el sistema (ver DT-028, renombrado desde `ciudad`) y no hay otro lugar hoy que distinga ambos datos; cambiarlo es un alcance mayor no pedido.
- **Consecuencias / costo asumido:** el orden de las partes depende del orden de las preguntas en el formulario (`orden`), no de un criterio semántico (ej. dirección antes que ciudad); si el admin reordena las preguntas, el formato del string cambia para respuestas futuras (no para las ya guardadas).
- **Revisar si:** aparece un caso real donde haga falta leer `ubicacion` de forma estructurada (ej. filtrar clientes por ciudad) — hoy es solo texto libre para mostrar, no para consultar.
- **Estado:** vigente

## D-D — Modelo híbrido de formularios confirmado, con identificador público (2026-10-27)
- **Contexto:** D-D quedaba abierto como `[SUPUESTO]`: un híbrido (relacional para lo consultable, JSONB para configuración/respuestas, versión inmutable) sin haber leído los 17 formularios reales. El usuario trajo un inventario generado desde los 17 JSON exportados (Microsoft Forms) para contrastarlo.
- **Decisión:** se confirma el híbrido tal como estaba implementado (`Formulario`→`FormularioVersion`/`FormularioGrupoPregunta`/`FormularioPregunta`→`FormularioRespuesta`), sin tabla por formulario, con 2 correcciones de esquema sobre la misma migración `98500168c7d6` (bajo D-008): `Formulario.version_activa` (int suelto) pasa a `version_activa_id` (FK real a `formulario_version.id`); se agrega `Formulario.token_publico` (UUID único) porque no existía ningún identificador no adivinable para la futura URL pública (RF-011/012). Además, 3 convenciones fijadas sin cambio de esquema (documentadas en el código, no en una tabla nueva): `configuracion.multiple`/`allow_other` para Choice no simple y "Otro"; `goto_codigo: "__fin__"` (constante `BranchingCodigos.FIN`) para salto al final; nuevo valor de catálogo `calificacion` en `formulario_pregunta_tipo`.
- **Alternativas descartadas:** tablas normalizadas por tipo de pregunta: más consultable por SQL plano, pero obliga a una tabla nueva cada vez que aparece un tipo de pregunta distinto en los 17 formularios (ya hay 6 tipos + secciones). Todo en JSONB sin ninguna columna relacional: más flexible, pero pierde `UNIQUE`/`FK` sobre `codigo` y `orden`, que el inventario mostró necesarios (hasta 109 preguntas repetidas por formulario, resueltas solo porque `FormularioGrupoPregunta` es una fila por grupo, no por repetición).
- **Consecuencias / costo asumido:** el importador de los 17 JSON (pendiente, ítem 2 del roadmap) debe traducir `Validation`/`IsNumber`/`BranchInfo` del formato de Microsoft Forms a estas convenciones; no hay script de validación automática que demuestre que el contraste manual fue exhaustivo.
- **Revisar si:** al escribir el importador aparece un patrón de los JSON que estas convenciones no cubran (ej. otro tipo de `BranchInfo`, u opciones con estructura distinta a `choices`).
- **Estado:** vigente

## D-015 — Pool de conexiones ampliado para el endpoint público (2026-10-29)
- **Contexto:** el usuario pidió prever desde ya que el sistema no colapse si 100-500 personas envían el formulario público al mismo tiempo. `core/db.py` tenía `pool_size=5, max_overflow=10` (15 conexiones máximo para TODO el backend, no solo formularios) y sin `pool_timeout` explícito (default de SQLAlchemy: 30s). El Postgres real (`juanfer_postgres`) tiene `max_connections=100` (verificado).
- **Decisión:** `pool_size=20, max_overflow=20` (40 conexiones máximo, dejando 60 libres de las 100 para pgAdmin/Alembic/el resto del sistema) y `pool_timeout=10` (si algo no consigue conexión en 10s, falla rápido y claro en vez de colgarse hasta 30s). Justificación de los números: una transacción de este sistema es corta (milisegundos), así que el pool no necesita ser 1:1 con las personas conectadas, solo cubrir cuántas transacciones están en vuelo al mismo instante.
- **Alternativas descartadas:** subir `max_connections` de Postgres también: no hacía falta, 40 conexiones de la app deja margen de sobra dentro del límite actual de 100. Mover el envío de correo (ver D-007) a reusar la sesión de la request en vez de abrir una propia: se descartó porque sostendría una conexión del pool durante la llamada de red a Resend, justo el problema que este pool ampliado no debe tener que compensar.
- **Consecuencias / costo asumido:** son números de partida sin carga real medida (no hay un test de carga que los valide); si en producción se ve que no alcanzan o que sobran, hay que volver a ajustarlos con datos reales.
- **Revisar si:** hay un pico real que agote el pool (errores de `pool_timeout`), o se mide carga real antes del despliegue y los números no calzan.
- **Estado:** vigente
