// ============================================================
// api/formularios.js
// Formularios dinámicos (builder + versionado + respuestas).
// Backend real desde el día 1 — sin patrón USE_MOCK (decisión
// explícita: el backend ya está listo y probado con pytest,
// mockear el JSONB de grupos/preguntas/branching no aporta).
// Endpoints reales (FastAPI, ver backend/app/routers/formulario.py
// y formulario_publico.py):
//   GET/POST          /formularios
//   GET/PUT/DELETE    /formularios/{id}
//   GET               /formularios/{id}/versiones
//   POST              /formularios/{id}/publicar
//   GET               /formularios/{id}/respuestas
//   GET/POST          /formularios/{id}/grupos
//   PUT/DELETE        /formularios/grupos/{id}
//   GET/POST          /formularios/{id}/preguntas
//   PUT/DELETE        /formularios/preguntas/{id}
//   GET               /public/formularios/{token_publico}
//   POST              /public/formularios/{token_publico}/respuestas
// ============================================================

import api from './axios.js'

// ============================================================
// FORMULARIO (cabecera)
// ============================================================
export async function listarFormularios(filtros = {}) {
  const params = Object.fromEntries(
    Object.entries(filtros).filter(([, v]) => v !== '' && v != null)
  )
  const { data } = await api.get('/formularios', { params })
  return data
}

export async function obtenerFormulario(id) {
  const { data } = await api.get(`/formularios/${id}`)
  return data
}

export async function crearFormulario(payload) {
  const { data } = await api.post('/formularios', payload)
  return data
}

export async function actualizarFormulario(id, payload) {
  const { data } = await api.put(`/formularios/${id}`, payload)
  return data
}

export async function eliminarFormulario(id) {
  const { data } = await api.delete(`/formularios/${id}`)
  return data
}

// ============================================================
// VERSIONES / PUBLICACIÓN
// ============================================================
export async function listarVersiones(formularioId) {
  const { data } = await api.get(`/formularios/${formularioId}/versiones`)
  return data
}

export async function publicarFormulario(formularioId) {
  const { data } = await api.post(`/formularios/${formularioId}/publicar`)
  return data
}

// ============================================================
// RESPUESTAS (vista admin)
// ============================================================
export async function listarRespuestas(formularioId) {
  const { data } = await api.get(`/formularios/${formularioId}/respuestas`)
  return data
}

export async function obtenerMetricas(formularioId) {
  const { data } = await api.get(`/formularios/${formularioId}/metricas`)
  return data
}

// ============================================================
// GRUPOS DE PREGUNTA (bloques repetibles, ej. "Asegurados")
// ============================================================
export async function listarGrupos(formularioId) {
  const { data } = await api.get(`/formularios/${formularioId}/grupos`)
  return data
}

export async function crearGrupo(formularioId, payload) {
  const { data } = await api.post(`/formularios/${formularioId}/grupos`, payload)
  return data
}

export async function actualizarGrupo(id, payload) {
  const { data } = await api.put(`/formularios/grupos/${id}`, payload)
  return data
}

export async function eliminarGrupo(id) {
  const { data } = await api.delete(`/formularios/grupos/${id}`)
  return data
}

// ============================================================
// PREGUNTAS
// ============================================================
export async function listarPreguntas(formularioId) {
  const { data } = await api.get(`/formularios/${formularioId}/preguntas`)
  return data
}

export async function crearPregunta(formularioId, payload) {
  const { data } = await api.post(`/formularios/${formularioId}/preguntas`, payload)
  return data
}

export async function actualizarPregunta(id, payload) {
  const { data } = await api.put(`/formularios/preguntas/${id}`, payload)
  return data
}

export async function eliminarPregunta(id) {
  const { data } = await api.delete(`/formularios/preguntas/${id}`)
  return data
}

// ============================================================
// VISTA PÚBLICA — sin auth, por token_publico (UUID)
// ============================================================
export async function obtenerFormularioPublico(token) {
  const { data } = await api.get(`/public/formularios/${token}`)
  return data
}

export async function enviarRespuestaPublica(token, payload) {
  const { data } = await api.post(`/public/formularios/${token}/respuestas`, payload)
  return data
}
