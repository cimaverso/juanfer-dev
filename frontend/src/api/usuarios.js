// ============================================================
// api/usuarios.js
// Acciones administrativas sobre Usuario (DT-023b, backend real
// desde el día 1 — sin patrón USE_MOCK, igual que formularios.js).
// Endpoint real (backend/app/routers/usuario.py):
//   POST /usuarios/{id}/generar-codigo-reset  (solo ADMIN)
// ============================================================

import api from './axios.js'

export async function generarCodigoReset(usuarioId) {
  const { data } = await api.post(`/usuarios/${usuarioId}/generar-codigo-reset`)
  return data.codigo
}
