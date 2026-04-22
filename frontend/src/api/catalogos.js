// ============================================================
// api/catalogos.js
// Catálogos maestros — REQ-17: configurables sin redeploy
// Endpoints reales esperados (FastAPI):
//   GET /api/v1/catalogos/estados-poliza
//   GET /api/v1/catalogos/aseguradoras
//   GET /api/v1/catalogos/productos
//   GET /api/v1/catalogos/ramos
//   GET /api/v1/catalogos/tipos-documento
//   GET /api/v1/usuarios?rol=ASESOR  (para selector de asesores)
// ============================================================

import api, { USE_MOCK } from './axios.js'
import {
  ESTADOS_POLIZA,
  ASEGURADORAS,
  PRODUCTOS,
  RAMOS,
  TIPOS_DOCUMENTO,
  ASESORES,
} from '../mocks/catalogos.mock.js'

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms))

// ── Cache en memoria — los catálogos no cambian en sesión ──
// Evita llamadas repetidas al backend por datos que no mutan
const _cache = {}

async function _cached(key, fetchFn) {
  if (_cache[key]) return _cache[key]
  const result = await fetchFn()
  _cache[key] = result
  return result
}

// ============================================================
// ESTADOS DE PÓLIZA
// ============================================================
export async function obtenerEstadosPoliza() {
  return _cached('estados_poliza', async () => {
    if (USE_MOCK) {
      await delay()
      return ESTADOS_POLIZA
    }
    const { data } = await api.get('/catalogos/estados-poliza')
    return data
  })
}

// ============================================================
// ASEGURADORAS
// ============================================================
export async function obtenerAseguradoras() {
  return _cached('aseguradoras', async () => {
    if (USE_MOCK) {
      await delay()
      return ASEGURADORAS
    }
    const { data } = await api.get('/catalogos/aseguradoras')
    return data
  })
}

// ============================================================
// PRODUCTOS
// ============================================================
export async function obtenerProductos() {
  return _cached('productos', async () => {
    if (USE_MOCK) {
      await delay()
      return PRODUCTOS
    }
    const { data } = await api.get('/catalogos/productos')
    return data
  })
}

// ============================================================
// RAMOS
// ============================================================
export async function obtenerRamos() {
  return _cached('ramos', async () => {
    if (USE_MOCK) {
      await delay()
      return RAMOS
    }
    const { data } = await api.get('/catalogos/ramos')
    return data
  })
}

// ============================================================
// TIPOS DE DOCUMENTO
// ============================================================
export async function obtenerTiposDocumento() {
  return _cached('tipos_documento', async () => {
    if (USE_MOCK) {
      await delay()
      return TIPOS_DOCUMENTO
    }
    const { data } = await api.get('/catalogos/tipos-documento')
    return data
  })
}

// ============================================================
// ASESORES (usuarios con rol ASESOR o ADMIN)
// Usado en: selector de responsable, filtros de producción
// ============================================================
export async function obtenerAsesores() {
  return _cached('asesores', async () => {
    if (USE_MOCK) {
      await delay()
      return ASESORES
    }
    const { data } = await api.get('/usuarios', { params: { activo: true } })
    return data
  })
}

// ============================================================
// TODOS LOS CATÁLOGOS DE UNA VEZ
// Para precarga en formularios que necesiten varios a la vez
// ============================================================
export async function obtenerTodosCatalogos() {
  const [estados, aseguradoras, productos, ramos, tiposDoc, asesores] =
    await Promise.all([
      obtenerEstadosPoliza(),
      obtenerAseguradoras(),
      obtenerProductos(),
      obtenerRamos(),
      obtenerTiposDocumento(),
      obtenerAsesores(),
    ])

  return { estados, aseguradoras, productos, ramos, tiposDoc, asesores }
}

// ============================================================
// INVALIDAR CACHE (útil cuando un admin agrega una aseguradora)
// ============================================================
export function invalidarCatalogos(key = null) {
  if (key) {
    delete _cache[key]
  } else {
    Object.keys(_cache).forEach((k) => delete _cache[k])
  }
}