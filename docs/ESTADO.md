# Estado
Actualizado manualmente (sin skill /cierre disponible en este entorno) — 2026-10-28

## Siguiente paso (UNO, concreto)
Probar con un formulario real, de punta a punta, que toda la información quede guardada sin errores (crear en el admin, publicar, diligenciar por la URL pública, confirmar la respuesta y el Cliente creado/reusado en la DB) — pendiente desde antes de esta sesión. Mientras eso no se confirme, el ítem 3 del roadmap sigue abierto aunque el front ya esté funcionalmente completo.

## Última sesión (2026-10-28, DT-022 y DT-023 completas — backend + frontend, commiteado y pusheado)
- Hecho, paso a paso con aprobación, los 4 puntos que quedaban front-only (`localStorage`/`Math.random`/nada):
  1. **Horario de disponibilidad (DT-022)**: tabla `horario_usuario` (migración `e9b767cac8f7`), `GET`/`PUT /mi-horario` (propio), `GET /horarios` (ADMIN, solo lectura). `MiPerfil.jsx` y `ConfiguracionEmpresa.jsx` conectados.
  2. **Datos de la empresa (DT-023a)**: tabla `empresa` singleton (migración `2d5bcbff6c72`), `GET`/`PUT /empresa`. `DatosEmpresa` conectado.
  3. **Restablecer contraseña (DT-023b)**: código de un solo uso (`secrets`, hasheado, expira en 60 min — columnas en `Usuario`, migración `b997d4111cba`). `POST /usuarios/{id}/generar-codigo-reset` (ADMIN) + `POST /auth/validar-codigo-reset` + `POST /auth/reset-password` (públicos). Pantalla nueva `pages/auth/RestablecerPassword.jsx` (ruta `/restablecer-password`, 2 pasos), enlazada desde `Login.jsx`. Botón de `UsuariosEmpresa` conectado.
  4. **Bloqueo de login**: columnas `intentos_fallidos`/`bloqueado_hasta` en `Usuario` (migración `45ae545b4c4f`); 3 fallidos consecutivos → bloqueo 15 min (`HTTPException 423`). `AuthContext.login()` ahora propaga el `detail` real del backend (antes solo funcionaba con el mock) y `Login.jsx` lo muestra.
- Verificado al cierre (`/cierre`), sobre el commit ya pusheado:
  - `uv run alembic heads` → un solo head (`45ae545b4c4f`).
  - `uv run pytest` desde `backend/` → **40 passed**. En el primer intento falló `test_reset_password_completo_y_login_con_clave_nueva` por un bloqueo real de login dejado por pruebas manuales en el navegador (ver "Incidente" abajo); se corrigió `test_reset_password.py` y `test_bloqueo_login.py` para limpiar ese estado dentro de su propio SAVEPOINT antes de cada caso, y quedó commiteado aparte.
  - `npm run lint` / `npm run build` desde `frontend/` → mismos 19 problemas de lint preexistentes (ajenos a esta sesión, en `Prospectos.jsx`/`ProspectoDetalle.jsx`/`ProspectoForm.jsx`), build sin errores.
  - Ningún `.jsx`/`.js` tocado pasa de 1000 líneas; sin hex nuevos fuera de `global.css`.
  - Probado manualmente end-to-end en el navegador por el usuario (los 4 puntos, incluido el flujo completo de reset de contraseña).
- **Incidente durante la sesión**: usar `(uv run uvicorn ... &)` en Git Bash para pruebas puntuales dejó un socket fantasma en el puerto 8000 (sin proceso real detrás, ni `taskkill` ni `Get-Process` lo encuentran). Workaround aplicado: `frontend/src/api/axios.js` tiene el fallback de `VITE_API_URL` en `http://localhost:8001` en vez de `:8000` (decisión: no sincronizar `.env.example`/GUIA.md, es temporal — ver DT-025). **Pendiente**: revertir a `:8000` cuando el puerto se libere.
- **Segundo incidente, detectado en el `/cierre`**: probar a mano el bloqueo de login (3 intentos fallidos) dejó cuentas reales (`gina@juanfer.com`, `diego@juanfer.com`) bloqueadas de verdad en `juanfer_postgres`, lo que rompió un test que asumía la cuenta desbloqueada (ver DT-024). Corregido.
- Commits de esta sesión (ya en remoto `origin/desarrollo`):
  - `ee4d793` — Feat(Configuracion): los 4 puntos de DT-022/023.
  - `89111a6` — Docs(Roadmap): importación masiva de formularios + reorden de Dashboard.
  - *(pendiente de commitear: el fix de los 2 tests + DT-024/025/026 + D-012, hechos durante este `/cierre`)*.

## Bloqueos / esperando mi respuesta
- Ninguno.

## Contexto que se pierde si no se escribe
- **El código de reset de contraseña no es una clave aplicada directo**: el admin genera un código de 8 caracteres que el usuario cambia por su propia contraseña nueva en `/restablecer-password` (2 pantallas) — decisión explícita del usuario sobre el diseño inicial que yo había propuesto (clave temporal usable para login). Registrada en docs/DECISIONES.md D-012.
- **`empresa` es singleton por convención de aplicación, no por constraint de DB** (DT-026): el service siempre toma/actualiza la primera fila que encuentra.
- **El puerto 8000 quedó con un socket fantasma de esta sesión** (DT-025) — `axios.js` apunta a `:8001` como workaround temporal.
- **Las pruebas sobre filas reales (`usuario`, `empresa`) deben limpiar su propio estado antes de asumir un punto de partida** (DT-024): esta sesión rompió dos veces por pruebas manuales en el navegador contra la misma DB de desarrollo.
- **`estado_id` (publicación) y `categoria_id` (negocio) son conceptos distintos a propósito** en Formulario — se evitó nombrarlos igual ("estado") para no repetir el error de confundir ciclo de vida de publicación con clasificación de negocio.
- **`prospecto_id` en `FormularioRespuesta` y su endpoint en Prospecto son deuda especulativa asumida a sabiendas** (DT-020, sesión anterior).
- **Dos ítems nuevos quedaron anotados en docs/ROADMAP.md "Siguiente" (2026-10-28, tarde), sin empezar**: (1) importación masiva de formularios — el usuario ya tiene los 17 JSON de MS Forms y un Excel consolidado armado a partir de ellos; (2) reordenar el Dashboard por secciones y agregarle las métricas de Formularios (ya existen en backend).

## Archivos tocados en el `/cierre` (sin commitear todavía)
- `backend/tests/test_reset_password.py`, `backend/tests/test_bloqueo_login.py` (limpieza de estado real antes de cada test, ver DT-024)
- `docs/DEUDA.md` (DT-024, DT-025, DT-026 nuevas, abiertas)
- `docs/DECISIONES.md` (D-012)
- `docs/ESTADO.md`
