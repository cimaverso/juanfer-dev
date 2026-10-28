# Estado
Actualizado manualmente (sin skill /cierre disponible en este entorno) — 2026-10-28

## Siguiente paso (UNO, concreto)
Probar con un formulario real, de punta a punta, que toda la información quede guardada sin errores (crear en el admin, publicar, diligenciar por la URL pública, confirmar la respuesta y el Cliente creado/reusado en la DB) — pendiente desde antes de esta sesión. Mientras eso no se confirme, el ítem 3 del roadmap sigue abierto aunque el front ya esté funcionalmente completo.

## Última sesión (2026-10-28, DT-022 y DT-023 completas — backend + frontend)
- Hecho, paso a paso con aprobación, los 4 puntos que quedaban front-only (`localStorage`/`Math.random`/nada):
  1. **Horario de disponibilidad (DT-022)**: tabla `horario_usuario` (migración `e9b767cac8f7`), `GET`/`PUT /mi-horario` (propio), `GET /horarios` (ADMIN, solo lectura). `MiPerfil.jsx` y `ConfiguracionEmpresa.jsx` conectados.
  2. **Datos de la empresa (DT-023a)**: tabla `empresa` singleton (migración `2d5bcbff6c72`), `GET`/`PUT /empresa`. `DatosEmpresa` conectado.
  3. **Restablecer contraseña (DT-023b)**: código de un solo uso (`secrets`, hasheado, expira en 60 min — columnas en `Usuario`, migración `b997d4111cba`). `POST /usuarios/{id}/generar-codigo-reset` (ADMIN) + `POST /auth/validar-codigo-reset` + `POST /auth/reset-password` (públicos). Pantalla nueva `pages/auth/RestablecerPassword.jsx` (ruta `/restablecer-password`, 2 pasos), enlazada desde `Login.jsx`. Botón de `UsuariosEmpresa` conectado.
  4. **Bloqueo de login**: columnas `intentos_fallidos`/`bloqueado_hasta` en `Usuario` (migración `45ae545b4c4f`); 3 fallidos consecutivos → bloqueo 15 min (`HTTPException 423`). `AuthContext.login()` ahora propaga el `detail` real del backend (antes solo funcionaba con el mock) y `Login.jsx` lo muestra.
- Verificado con:
  - `uv run pytest` desde `backend/` → **40 passed** (eran 24 al cierre de la sesión anterior; 16 tests nuevos).
  - `upgrade head`/`downgrade -1`/`upgrade head` probados para las 4 migraciones nuevas contra `juanfer_postgres`.
  - Probado manualmente end-to-end en el navegador por el usuario (los 4 puntos, incluido el flujo completo de reset de contraseña).
- **Incidente durante la sesión**: usar `(uv run uvicorn ... &)` en Git Bash para pruebas puntuales dejó un socket fantasma en el puerto 8000 (sin proceso real detrás, ni `taskkill` ni `Get-Process` lo encuentran). Workaround aplicado: `frontend/src/api/axios.js` tiene el fallback de `VITE_API_URL` en `http://localhost:8001` en vez de `:8000`. **Pendiente**: revertir a `:8000` cuando el puerto se libere (cerrar sesión o reiniciar Windows), o decidir dejarlo fijo en `:8001`.
- Commits: ninguno todavía de esta sesión. (Corrección: lo de formularios de la sesión anterior, que esta nota decía "sin commitear desde `5b434e2`", en realidad ya quedó commiteado — `b24e728`, `fa4735d`, `541b2af`, `20264a5`, `e51a80f`. Esa frase estaba desactualizada.)

## Bloqueos / esperando mi respuesta
- Ninguno.

## Contexto que se pierde si no se escribe
- **El código de reset de contraseña no es una clave aplicada directo**: el admin genera un código de 8 caracteres que el usuario cambia por su propia contraseña nueva en `/restablecer-password` (2 pantallas) — decisión explícita del usuario sobre el diseño inicial que yo había propuesto (clave temporal usable para login).
- **`empresa` es singleton por convención de aplicación, no por constraint de DB** (no hay `CHECK(id=1)`): el service siempre toma/actualiza la primera fila que encuentra. Si alguna vez se inserta una segunda fila por fuera del service, el comportamiento sería ambiguo (no hay nada que lo impida a nivel de esquema).
- **El puerto 8000 quedó con un socket fantasma de esta sesión** (ver arriba) — `axios.js` apunta a `:8001` como workaround temporal, decisión del usuario de resolverlo después.
- **`estado_id` (publicación) y `categoria_id` (negocio) son conceptos distintos a propósito** en Formulario — se evitó nombrarlos igual ("estado") para no repetir el error de confundir ciclo de vida de publicación con clasificación de negocio.
- **`prospecto_id` en `FormularioRespuesta` y su endpoint en Prospecto son deuda especulativa asumida a sabiendas** (DT-020, sesión anterior): se señaló al usuario que viola la regla del propio CLAUDE.md de no construir para requisitos hipotéticos, y decidió seguir igual.
- **Dos ítems nuevos quedaron anotados en docs/ROADMAP.md "Siguiente" (2026-10-28, tarde), sin empezar**: (1) importación masiva de formularios — el usuario ya tiene los 17 JSON de MS Forms y un Excel consolidado armado a partir de ellos, listos para usar como insumo real del diseño del importador; (2) reordenar el Dashboard por secciones y agregarle las métricas de Formularios (que ya existen en backend). Ninguno de los dos se tocó todavía — quedan para cuando se retome el trabajo.

## Archivos tocados (no confirmados en commit todavía — DT-022 + DT-023)
- Backend: `app/models/usuarios_clientes/{horario_usuario,empresa}.py` (nuevos), `app/models/usuarios_clientes/usuario.py` (reset + bloqueo), `app/models/__init__.py`
- Backend: `app/schemas/{horario_usuario,empresa}.py` (nuevos), `app/schemas/auth.py`
- Backend: `app/services/{horario_usuario,empresa}.py` (nuevos), `app/services/usuario.py` (reset), `app/services/auth.py` (bloqueo)
- Backend: `app/routers/{horario_usuario,empresa}.py` (nuevos), `app/routers/usuario.py`, `app/routers/auth.py`, `app/main.py`
- Backend: migraciones `e9b767cac8f7`, `2d5bcbff6c72`, `b997d4111cba`, `45ae545b4c4f`
- Backend: `tests/test_{horario_usuario,empresa,reset_password,bloqueo_login}.py` (nuevos)
- Frontend: `api/{horarios,empresa,usuarios,auth}.js` (nuevos)
- Frontend: `pages/perfil/MiPerfil.jsx`, `pages/admin/ConfiguracionEmpresa.jsx`, `pages/auth/{Login.jsx,Login.css}`, `pages/auth/RestablecerPassword.{jsx,css}` (nuevos), `context/AuthContext.jsx`, `router/AppRouter.jsx`, `api/axios.js` (puerto 8001, ver arriba)
- `docs/DEUDA.md` (DT-022 y DT-023 → Pagadas), `docs/ESTADO.md`
