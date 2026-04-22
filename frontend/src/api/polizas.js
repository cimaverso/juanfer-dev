// ============================================================
// api/polizas.js  v2
// Nuevos filtros: mes (YYYY-MM) y ramo
// Nuevos métodos: obtenerMesesDisponibles, obtenerRamosUsados
// ============================================================

import api, { USE_MOCK } from './axios.js'
import { MOCK_POLIZAS, getPolizaById } from '../mocks/polizas.mock.js'

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms))

let _polizas = [...MOCK_POLIZAS]
let _nextId  = Math.max(..._polizas.map((p) => p.id)) + 1

// ============================================================
// LISTAR PÓLIZAS
// params: { estado, aseguradora, ramo, responsable_id,
//           mes, search }
// mes formato: 'YYYY-MM' — filtra por fecha_solicitud
// ============================================================
export async function listarPolizas(params = {}) {
  if (USE_MOCK) {
    await delay()
    let resultado = [..._polizas]

    if (params.estado)
      resultado = resultado.filter((p) => p.estado === params.estado)

    if (params.aseguradora)
      resultado = resultado.filter((p) => p.aseguradora === params.aseguradora)

    if (params.ramo)
      resultado = resultado.filter((p) => p.ramo === params.ramo)

    if (params.responsable_id)
      resultado = resultado.filter(
        (p) => p.responsable_id === parseInt(params.responsable_id)
      )

    if (params.mes)
      resultado = resultado.filter(
        (p) => p.fecha_solicitud && p.fecha_solicitud.startsWith(params.mes)
      )

    if (params.search) {
      const q = params.search.toLowerCase()
      resultado = resultado.filter(
        (p) =>
          p.cliente_nombre.toLowerCase().includes(q) ||
          p.cliente_documento.toLowerCase().includes(q) ||
          (p.numero_poliza && p.numero_poliza.toLowerCase().includes(q))
      )
    }

    resultado.sort(
      (a, b) => new Date(b.fecha_solicitud) - new Date(a.fecha_solicitud)
    )

    return { data: resultado, total: resultado.length }
  }

  const { data } = await api.get('/polizas', { params })
  return data
}

// ============================================================
// MESES DISPONIBLES — selector dinámico
// Devuelve ['2025-03', '2025-02', ...] de los datos reales
// ============================================================
export async function obtenerMesesDisponibles() {
  if (USE_MOCK) {
    await delay(150)
    const meses = [
      ...new Set(
        _polizas
          .filter((p) => p.fecha_solicitud)
          .map((p) => p.fecha_solicitud.slice(0, 7))
      ),
    ].sort((a, b) => b.localeCompare(a))
    return meses
  }
  const { data } = await api.get('/polizas/meses-disponibles')
  return data
}

// ============================================================
// RAMOS USADOS — selector dinámico
// Solo muestra ramos que tienen pólizas, no toda la tabla
// ============================================================
export async function obtenerRamosUsados() {
  if (USE_MOCK) {
    await delay(150)
    return [...new Set(_polizas.map((p) => p.ramo))].sort()
  }
  const { data } = await api.get('/polizas/ramos-usados')
  return data
}

// ============================================================
// OBTENER PÓLIZA POR ID
// ============================================================
export async function obtenerPoliza(id) {
  if (USE_MOCK) {
    await delay(250)
    const poliza = getPolizaById(id)
    if (!poliza)
      throw { response: { status: 404, data: { detail: 'Póliza no encontrada' } } }
    return poliza
  }
  const { data } = await api.get(`/polizas/${id}`)
  return data
}

// ============================================================
// CREAR PÓLIZA
// ============================================================
export async function crearPoliza(payload) {
  if (USE_MOCK) {
    await delay(600)
    if (!payload.cliente_documento)
      throw { response: { status: 422, data: { detail: 'Cédula requerida' } } }

    const nueva = {
      id: _nextId++,
      version: 1,
      fecha_solicitud:  payload.fecha_solicitud || new Date().toISOString().slice(0, 10),
      fecha_expedicion: payload.fecha_expedicion || null,
      numero_poliza:    payload.numero_poliza || null,
      prima:            payload.prima ? parseFloat(payload.prima) : null,
      observacion:      payload.observacion || '',
      estado_color:     _estadoColor(payload.estado),
      ...payload,
    }
    _polizas = [nueva, ..._polizas]
    return nueva
  }
  const { data } = await api.post('/polizas', payload)
  return data
}

// ============================================================
// EDITAR PÓLIZA — control optimista de concurrencia (NFR-02)
// ============================================================
export async function editarPoliza(id, payload) {
  if (USE_MOCK) {
    await delay(500)
    const idx = _polizas.findIndex((p) => p.id === parseInt(id))
    if (idx === -1)
      throw { response: { status: 404, data: { detail: 'Póliza no encontrada' } } }

    const actual = _polizas[idx]
    if (payload.version && payload.version !== actual.version)
      throw {
        response: {
          status: 409,
          data: { detail: 'Conflicto: la póliza fue modificada por otro usuario. Recarga y reintenta.' },
        },
      }

    const actualizada = {
      ...actual, ...payload,
      id: actual.id,
      version: actual.version + 1,
      estado_color: _estadoColor(payload.estado || actual.estado),
    }
    _polizas = _polizas.map((p) => (p.id === parseInt(id) ? actualizada : p))
    return actualizada
  }
  const { data } = await api.put(`/polizas/${id}`, payload)
  return data
}

// ============================================================
// ELIMINAR PÓLIZA
// ============================================================
export async function eliminarPoliza(id) {
  if (USE_MOCK) {
    await delay(400)
    if (!_polizas.some((p) => p.id === parseInt(id)))
      throw { response: { status: 404, data: { detail: 'Póliza no encontrada' } } }
    _polizas = _polizas.filter((p) => p.id !== parseInt(id))
    return { ok: true }
  }
  const { data } = await api.delete(`/polizas/${id}`)
  return data
}

// ============================================================
// TRASPASO DE RESPONSABLE
// ============================================================
export async function traspasarPoliza(id, payload) {
  if (USE_MOCK) {
    await delay(500)
    const idx = _polizas.findIndex((p) => p.id === parseInt(id))
    if (idx === -1)
      throw { response: { status: 404, data: { detail: 'Póliza no encontrada' } } }
    if (!payload.motivo?.trim())
      throw { response: { status: 422, data: { detail: 'El motivo es obligatorio' } } }

    _polizas = _polizas.map((p) =>
      p.id === parseInt(id)
        ? { ...p, responsable_id: payload.usuario_nuevo_id, responsable_nombre: payload.responsable_nombre || p.responsable_nombre }
        : p
    )
    return { ok: true }
  }
  const { data } = await api.post(`/polizas/${id}/traspaso`, payload)
  return data
}

// ============================================================
// HISTORIAL DE RESPONSABLE
// ============================================================
export async function obtenerHistorialResponsable(polizaId) {
  if (USE_MOCK) { await delay(300); return [] }
  const { data } = await api.get(`/polizas/${polizaId}/historial-responsable`)
  return data
}

// ============================================================
// BUSCAR CLIENTE POR DOCUMENTO
// ============================================================
export async function buscarClientePorDocumento(documento) {
  if (USE_MOCK) {
    await delay(350)
    const { MOCK_CLIENTES } = await import('../mocks/polizas.mock.js')
    return MOCK_CLIENTES.find((c) => c.numero_documento === documento.trim()) || null
  }
  const { data } = await api.get('/clientes/buscar', { params: { documento } })
  return data
}

// ── Helper interno ────────────────────────────────────────
function _estadoColor(estado) {
  const mapa = {
    'Expedido':                 'expedido',
    'En proceso de firma':      'proceso',
    'Evaluación médica':        'evaluacion',
    'Declinado':                'declinado',
    'Pospuesto':                'pospuesto',
    'Cancelado':                'cancelado',
    'Pendiente de complemento': 'pendiente',
  }
  return mapa[estado] || 'pendiente'
}