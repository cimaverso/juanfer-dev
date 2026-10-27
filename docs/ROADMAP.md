# Roadmap
Última revisión: 2026-10-27

## Ahora (en curso, máx. 3 ítems)
- [ ] **1. Modelo de datos de formularios** — Por qué: la última migración dejó errores en runtime (server levanta, falla al ejecutar) y el modelo actual no soporta crear, versionar ni importar formularios. Paso previo: reproducir el error y capturar el traceback antes de rediseñar nada; es una hipótesis, no un hecho, que el modelo sea la causa. · Salida cuando: la migración de formularios corregida (D-008) o una nueva, sin tocar las 4 migraciones anteriores; `alembic upgrade head` y `downgrade -1` funcionan; los 17 formularios existentes caben sin una tabla por formulario; el server arranca y los endpoints actuales responden sin error en runtime. · Reqs: RF-007, RF-008, RF-009, RNF-006
- [ ] **2. Backend: formularios y catálogos** — Por qué: soportar las features nuevas con endpoints y servicios. Depende del ítem 1. · Salida cuando: CRUD de formularios y catálogos para el admin, con auth; un endpoint público por token o UUID, sin auth, con límite de envíos; todo probado en `/docs` y con pruebas automáticas mínimas (pytest se agrega aquí, ver deuda). · Reqs: RF-006, RF-010, RF-011, RF-012, RNF-002, RNF-003, RNF-004, RNF-010, RNF-011
- [ ] **3. Frontend: panel admin y vista pública** — Por qué: que el admin gestione formularios y catálogos, y que el asegurado los diligencie por URL. Depende del ítem 2. · Salida cuando: `npm run lint` y `npm run build` sin errores; ningún `.js` ni `.jsx` pasa de 1000 líneas; ningún hex fuera de los tokens; pantallas nuevas responsive y en modo claro y oscuro; flujo completo: crear el formulario en el admin, abrirlo por URL pública, enviarlo y ver la respuesta en el panel. · Reqs: RF-006, RF-010, RF-011, RF-012, RNF-007, RNF-008, RNF-009, RNF-013

## Siguiente (decidido, no empezado)
- [ ] **Correo con Resend** al dueño por cada formulario enviado, bien maquetado. Depende del ítem 2: necesita respuestas guardadas. Pendiente: dominio verificado y destinatario. · Reqs: RF-014, RNF-010
- [ ] **Importar formularios desde Excel o JSON.** El modelo del ítem 1 debe dejarlo posible; no se implementa antes. Pendiente: definir el formato de entrada. · Reqs: RF-013
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
