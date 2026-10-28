// ============================================================
// api/empresa.js
// Datos de la empresa (DT-023a, fila única). Backend real desde
// el día 1 — sin patrón USE_MOCK, igual que formularios.js.
// Endpoints reales (backend/app/routers/empresa.py):
//   GET /empresa  (cualquier usuario autenticado)
//   PUT /empresa  (solo ADMIN)
// ============================================================

import api from './axios.js'

export async function obtenerEmpresa() {
  const { data } = await api.get('/empresa')
  return data
}

export async function guardarEmpresa(datos) {
  const { data } = await api.put('/empresa', datos)
  return data
}
