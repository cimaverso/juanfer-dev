# Roadmap
Última revisión: 2026-10-28 (tarde)

## Ahora (en curso, máx. 3 ítems)
- [x] **1. Modelo de datos de formularios** — Por qué: la última migración dejó errores en runtime (server levanta, falla al ejecutar) y el modelo actual no soportaba crear, versionar ni importar formularios. · Salida cuando: la migración de formularios corregida (D-008), sin tocar las 4 migraciones anteriores; `alembic upgrade head` y `downgrade -1` funcionan; los 17 formularios existentes caben sin una tabla por formulario (confirmado contra inventario real); el server arranca y los endpoints actuales responden sin error en runtime (login 200 OK confirmado). · Reqs: RF-007, RF-008, RF-009, RNF-006 · Cerrado 2026-10-27 (ver docs/DECISIONES.md D-D)
- [x] **2. Backend: formularios y catálogos** — Por qué: soportar las features nuevas con endpoints y servicios. Depende del ítem 1 (cerrado). · Salida cuando: CRUD de formularios y catálogos para el admin, con auth; un endpoint público por token o UUID, sin auth, con límite de envíos; todo probado en `/docs` y con pruebas automáticas mínimas (pytest se agrega aquí, ver deuda). · Reqs: RF-006, RF-010, RF-011, RF-012, RNF-002, RNF-003, RNF-004, RNF-010, RNF-011 · Cerrado 2026-10-27 (CRUD de `Formulario`, builder, publicación, endpoint público con D-009/D-010/D-011, catálogo genérico editable; 12 pytest en verde — no se probó `/docs` a mano, el usuario decidió cerrar igual)
- [x] **3. Frontend: panel admin y vista pública** — Por qué: que el admin gestione formularios y catálogos, y que el asegurado los diligencie por URL. Depende del ítem 2. · Salida cuando: `npm run lint` y `npm run build` sin errores; ningún `.js` ni `.jsx` pasa de 1000 líneas; ningún hex fuera de los tokens; pantallas nuevas responsive y en modo claro y oscuro; flujo completo: crear el formulario en el admin, abrirlo por URL pública, enviarlo y ver la respuesta en el panel. · Reqs: RF-006, RF-010, RF-011, RF-012, RNF-007, RNF-008, RNF-009, RNF-013 · Cerrado 2026-10-29: el criterio pendiente ("probar un formulario real completo de punta a punta") se cumplió con los 17 formularios reales importados y probados en la DB real (ver docs/ESTADO.md).

## Siguiente (decidido, no empezado)
- [ ] **Filtro de usuarios en Configuración → Empresa → Usuarios** (nombre + rol) — pedido el 2026-10-29 al cerrar el CRUD completo de usuarios. Pendiente: decidir filtrado en cliente vs. backend (cliente alcanza hoy, pocos usuarios).
- [x] **Importación masiva de formularios** (épica) — los 17 formularios reales de MS Forms quedaron importados en la DB real, sin duplicados, probados de punta a punta. Cerrado 2026-10-29 por el usuario; detalle completo de los bugs encontrados y corregidos en el camino (truncado de título/subtítulo, orden del grupo repetible, detección de rol tomador/asegurado, campos críticos faltantes, resiliencia del importador) en docs/ESTADO.md. · Reqs: RF-013
- [ ] **Dashboard: reordenar por secciones + métricas de Formularios** — el dashboard actual no está organizado por secciones claras y no muestra nada del módulo de Formularios (que ya tiene métricas reales en backend: `GET /formularios/{id}/metricas`, ver docs/modulos/formularios.md). Señalado el 2026-10-28 (tarde), no empezado. Confirmado el 2026-10-29 como el siguiente foco explícito del usuario tras cerrar formularios. Pendiente: decidir qué métricas de Formularios van en el dashboard general (¿agregadas de todos los formularios, o por formulario?) antes de tocar `Dashboard.jsx`.
- [ ] **Correo con Resend** al dueño por cada formulario enviado, bien maquetado. Depende del ítem 2 (cerrado): necesita respuestas guardadas. Pendiente: dominio verificado y destinatario. · Reqs: RF-014, RNF-010
- [ ] **Pulido continuo de UI/UX** del builder de formularios y la vista pública — no bloqueante para cerrar el ítem 3, pero señalado explícitamente el 2026-10-28 para no perderlo de vista en próximas sesiones (tamaños de fuente, estados hover, orden visual).
- [ ] **Auditoría de responsive** de las pantallas existentes (RNF-013): importante, no urgente. Se ejecuta tras cerrar los tres de "Ahora".

## Después (idea con razón, sin fecha)
- **Despliegue a producción** (nginx, `docker-compose.yml`, Dokploy): se aborda cuando todo esté listo y testeado en local. Hay hallazgos anotados para ese momento (ver DEUDA).
- **Pagar la deuda de hex sueltos** (98 en código existente): se resuelve al tocar cada archivo, no en un hito aparte.

## Descartado (y por qué)
- `tokens.css` de la plantilla — ya existe `frontend/src/styles/global.css` como fuente de verdad y los nombres chocarían.
- Pagos, facturación, integraciones con aseguradoras, app móvil y portal del cliente — fuera del alcance acordado.

## Reglas
- Nada entra en "Ahora" sin criterio de salida.
- Máximo 3 en "Ahora": si entra uno, sale otro.
- Si algo lleva >3 sesiones en "Ahora" sin avance, se replantea o se parte.
