// ============================================================
// api/horarios.js
// Horario de disponibilidad por usuario (DT-022, backend real
// desde el día 1 — sin patrón USE_MOCK, igual que formularios.js).
// Endpoints reales (backend/app/routers/horario_usuario.py):
//   GET/PUT /mi-horario    (propio, cualquier usuario autenticado)
//   GET     /horarios      (solo ADMIN, lectura del equipo)
// ============================================================

import api from './axios.js'

export async function obtenerMiHorario() {
  const { data } = await api.get('/mi-horario')
  return data
}

export async function guardarMiHorario(dias) {
  const { data } = await api.put('/mi-horario', dias)
  return data
}

export async function obtenerHorariosEquipo() {
  const { data } = await api.get('/horarios')
  return data
}
