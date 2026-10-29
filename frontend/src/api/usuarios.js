// ============================================================
// api/usuarios.js
// CRUD administrativo de Usuario (DT-023b, backend real desde
// el día 1 — sin patrón USE_MOCK, igual que formularios.js).
// A propósito NO usa el caché de api/catalogos.js (obtenerAsesores):
// esa caché es para selects que no cambian en la sesión; esta
// pantalla de admin necesita ver altas/ediciones/bajas al tiro.
// Endpoints reales (backend/app/routers/usuario.py):
//   GET    /usuarios                           (ve inactivos filtrados ya)
//   POST   /usuarios                            (solo ADMIN)
//   PUT    /usuarios/{id}                       (solo ADMIN)
//   DELETE /usuarios/{id}  (borrado lógico)      (solo ADMIN)
//   POST   /usuarios/{id}/generar-codigo-reset   (solo ADMIN)
// ============================================================

import api from './axios.js'

export async function listarUsuarios() {
  const { data } = await api.get('/usuarios/')
  return data
}

export async function crearUsuario(payload) {
  const { data } = await api.post('/usuarios/', payload)
  return data
}

export async function actualizarUsuario(id, payload) {
  const { data } = await api.put(`/usuarios/${id}`, payload)
  return data
}

export async function eliminarUsuario(id) {
  await api.delete(`/usuarios/${id}`)
}

export async function generarCodigoReset(usuarioId) {
  const { data } = await api.post(`/usuarios/${usuarioId}/generar-codigo-reset`)
  return data.codigo
}
