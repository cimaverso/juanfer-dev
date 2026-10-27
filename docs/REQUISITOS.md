# Requisitos
Prioridad: M = Must · S = Should · C = Could · W = Won't (por ahora)
Estado: propuesto · aprobado · en curso · hecho · descartado

Nota: los criterios de aceptación de los RF-006 a RF-014 los redactó Claude a partir de lo conversado; siguen en "propuesto" hasta que se aprueben.

## Funcionales

### Ya existentes (según el usuario, funcionales)
| ID | Requisito | Prio | Criterio de aceptación (verificable) | Módulo | Estado |
|---|---|---|---|---|---|
| RF-001 | El sistema permite gestionar prospectos y clientes. | M | [PENDIENTE] | prospectos | hecho |
| RF-002 | El sistema permite gestionar pólizas. | M | [PENDIENTE] | produccion | hecho |
| RF-003 | El sistema permite importar prospectos masivamente desde CSV. | M | [PENDIENTE] | prospectos | hecho |
| RF-004 | El sistema permite importar pólizas masivamente. | M | [PENDIENTE] | produccion | hecho |
| RF-005 | Las rutas del panel exigen autenticación. | M | [PENDIENTE] | auth | hecho |

### Nuevos (urgentes)
| ID | Requisito | Prio | Criterio de aceptación (verificable) | Módulo | Estado |
|---|---|---|---|---|---|
| RF-006 | Un administrador puede crear, editar y eliminar formularios desde el panel admin. | M | Dado un admin autenticado, cuando crea, edita y elimina un formulario, entonces los cambios se reflejan en el listado y en la base. | formularios | propuesto |
| RF-007 | Un formulario se define con un modelo genérico: crear uno nuevo no requiere tablas ni migraciones nuevas. | M | Dado el modelo final, cuando se crea un formulario nuevo desde el panel, entonces no se ejecuta ninguna migración. | formularios | propuesto |
| RF-008 | Los 17 formularios existentes caben en el modelo genérico. | M | Dado el modelo final, cuando se cargan los 17, entonces todos se renderizan completos en la vista pública. | formularios | propuesto |
| RF-009 | Cada respuesta queda asociada a la versión del formulario con la que se contestó. | M | Dado un formulario con respuestas, cuando el admin lo edita, entonces las respuestas anteriores siguen mostrándose con su estructura original. | formularios | propuesto |
| RF-010 | Un asegurado o interesado puede abrir un formulario por URL, sin iniciar sesión, y enviarlo. | M | Dada una URL pública válida, cuando se abre y se envía, entonces la respuesta se guarda y se confirma al usuario. | formularios | propuesto |
| RF-011 | Un administrador puede ver las respuestas enviadas desde el panel. | M | Dado un formulario enviado, cuando el admin abre el panel, entonces ve esa respuesta con sus valores. | formularios | propuesto |
| RF-012 | Un administrador puede crear, editar y eliminar los catálogos de la base desde el front. | M | Dado un admin autenticado, cuando modifica un catálogo, entonces el cambio se refleja en los formularios y pantallas que lo usan. | catalogos | propuesto |
| RF-013 | Un formulario puede importarse desde Excel o JSON. | S | [PENDIENTE] — formato de entrada sin definir. | formularios | propuesto |
| RF-014 | Cada envío de formulario notifica por correo al dueño con una copia o las respuestas, con diseño cuidado, usando Resend. | S | Dado un envío nuevo, cuando se guarda la respuesta, entonces el dueño recibe un correo con su contenido. | formularios | propuesto |

## No funcionales
| ID | Atributo | Requisito medible | Cómo se verifica | Estado |
|---|---|---|---|---|
| RNF-001 | Seguridad | Ningún secreto ni `.env` en el repo. | `git ls-files` sin `.env`; revisión antes de cada push. (Hoy: ningún `.env` rastreado.) | hecho |
| RNF-002 | Seguridad | La URL pública de un formulario no es enumerable: usa token o UUID, no un ID incremental. | Probar que adivinar IDs consecutivos no devuelve formularios. | propuesto |
| RNF-003 | Seguridad | El endpoint público de envío tiene límite de envíos por origen. Umbral: [PENDIENTE]. | Prueba de exceso de peticiones. | propuesto |
| RNF-004 | Seguridad | Los endpoints del panel exigen autenticación; solo los endpoints públicos de formularios no. | Revisión de rutas y prueba sin token. | propuesto |
| RNF-005 | Datos personales | El formulario público muestra la autorización de tratamiento de datos antes del envío (Ley 1581 de 2012). Texto y aprobación legal: [PENDIENTE]. | Revisión del formulario público. | propuesto |
| RNF-006 | Mantenibilidad | Todo cambio de modelo SQLAlchemy va con su migración Alembic en el mismo commit; las 4 migraciones anteriores a la de formularios no se editan (la de formularios se rige por D-008). | `alembic upgrade head` y `downgrade -1` sin error en base descartable. | propuesto |
| RNF-007 | Mantenibilidad | Ningún `.js` ni `.jsx` supera 1000 líneas. | Conteo de líneas por archivo. | propuesto |
| RNF-008 | Mantenibilidad | El código nuevo del front usa solo tokens de `global.css`, sin hex sueltos. | `grep` de hex en `src` excluyendo `global.css`. Hoy hay 98 en código existente (ver DEUDA). | propuesto |
| RNF-009 | Usabilidad | Las pantallas nuevas funcionan en modo claro y oscuro. | Revisión manual en ambos temas. | propuesto |
| RNF-010 | Fiabilidad | La respuesta se guarda antes de enviar el correo; si Resend falla, la respuesta no se pierde. | Prueba con el envío de correo forzado a fallar. | propuesto |
| RNF-011 | Pruebas | Pruebas automáticas mínimas en el backend para formularios y catálogos. Hoy no hay pytest. | `pytest` pasa. | propuesto |
| RNF-012 | Rendimiento | [PENDIENTE] — sin medir ni definir. | — | propuesto |
| RNF-013 | Usabilidad | Todo el front es 100% responsive: sin scroll horizontal ni elementos cortados o inalcanzables en móvil, tablet y escritorio. Prioridad S: importante, no urgente. Anchos de prueba: [PENDIENTE] (propuesta: 360, 768, 1024 y 1280 px). | Revisión manual de cada pantalla en esos anchos, en modo claro y oscuro. | propuesto |

## Restricciones
- Las 4 migraciones anteriores a la de formularios son intocables: solo se agregan nuevas. La de formularios (`98500168c7d6`, head) puede reescribirse bajo D-008.
- SQLAlchemy síncrono con `psycopg` 3 (decisión candidata D-001).
- Gestores: `uv` en backend, `npm` en frontend.
- Alcance local primero: despliegue con nginx, compose y Dokploy queda `[PENDIENTE]`.
- Datos personales de asegurados: aplica la Ley 1581 de 2012 (habeas data).
- Correo con Resend: requiere dominio verificado para enviar desde el correo de la empresa. Estado: [PENDIENTE].

## Preguntas abiertas
- Estructura real de los 17 formularios (tipos de campo, secciones, catálogos referenciados). Bloquea cerrar el modelo (RF-007, RF-008).
- Si cada respuesta debe vincularse a un prospecto o cliente existente, o puede ser anónima. Bloquea RF-010 y RF-011.
- Qué catálogos debe poder editar el panel. Bloquea RF-012.
- Formato exacto de importación en Excel o JSON. Bloquea RF-013.
- Texto de autorización de datos y si ya existe uno aprobado. Bloquea RNF-005.
- Umbral del límite de envíos. Bloquea RNF-003.
- Dominio de correo del dueño y destinatario exacto. Bloquea RF-014.
- Criterios de aceptación de RF-001 a RF-005: describir el comportamiento actual cuando se revise cada módulo.
- Estado real de responsive en las pantallas existentes (no auditado) y dispositivos objetivo. Define el alcance de RNF-013.
- Alcance real de `pages/admin/AdminCatalogos.jsx` (ya existe, sin leer) frente a RF-012: qué catálogos edita y cuáles faltan.
