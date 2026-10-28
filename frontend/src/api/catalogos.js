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

// ============================================================
// ADMIN — CRUD de catálogos legacy (estados-poliza, aseguradoras,
// productos, ramos, tipos-documento, estados-prospecto).
// Backend real desde el día 1 — sin patrón USE_MOCK (misma
// decisión que el catálogo genérico y formularios.js: el backend
// ya existe y está probado, no hay nada que mockear).
// Cada mutación invalida la cache de lectura correspondiente para
// que los selectores (ProspectoForm, PolizaForm) vean el cambio.
// ============================================================

// ── Estados de póliza ──
export async function crearEstadoPoliza(payload) {
  const { data } = await api.post('/catalogos/estados-poliza', payload)
  invalidarCatalogos('estados_poliza')
  return data
}
export async function actualizarEstadoPoliza(id, payload) {
  const { data } = await api.put(`/catalogos/estados-poliza/${id}`, payload)
  invalidarCatalogos('estados_poliza')
  return data
}
export async function eliminarEstadoPoliza(id) {
  const { data } = await api.delete(`/catalogos/estados-poliza/${id}`)
  invalidarCatalogos('estados_poliza')
  return data
}

// ── Aseguradoras ──
export async function crearAseguradora(payload) {
  const { data } = await api.post('/catalogos/aseguradoras', payload)
  invalidarCatalogos('aseguradoras')
  return data
}
export async function actualizarAseguradora(id, payload) {
  const { data } = await api.put(`/catalogos/aseguradoras/${id}`, payload)
  invalidarCatalogos('aseguradoras')
  return data
}
export async function eliminarAseguradora(id) {
  const { data } = await api.delete(`/catalogos/aseguradoras/${id}`)
  invalidarCatalogos('aseguradoras')
  return data
}

// ── Productos ──
export async function crearProducto(payload) {
  const { data } = await api.post('/catalogos/productos', payload)
  invalidarCatalogos('productos')
  return data
}
export async function actualizarProducto(id, payload) {
  const { data } = await api.put(`/catalogos/productos/${id}`, payload)
  invalidarCatalogos('productos')
  return data
}
export async function eliminarProducto(id) {
  const { data } = await api.delete(`/catalogos/productos/${id}`)
  invalidarCatalogos('productos')
  return data
}

// ── Ramos ──
export async function crearRamo(payload) {
  const { data } = await api.post('/catalogos/ramos', payload)
  invalidarCatalogos('ramos')
  return data
}
export async function actualizarRamo(id, payload) {
  const { data } = await api.put(`/catalogos/ramos/${id}`, payload)
  invalidarCatalogos('ramos')
  return data
}
export async function eliminarRamo(id) {
  const { data } = await api.delete(`/catalogos/ramos/${id}`)
  invalidarCatalogos('ramos')
  return data
}

// ── Tipos de documento ──
export async function crearTipoDocumento(payload) {
  const { data } = await api.post('/catalogos/tipos-documento', payload)
  invalidarCatalogos('tipos_documento')
  return data
}
export async function actualizarTipoDocumento(id, payload) {
  const { data } = await api.put(`/catalogos/tipos-documento/${id}`, payload)
  invalidarCatalogos('tipos_documento')
  return data
}
export async function eliminarTipoDocumento(id) {
  const { data } = await api.delete(`/catalogos/tipos-documento/${id}`)
  invalidarCatalogos('tipos_documento')
  return data
}

// ── Estados de prospecto ──
// Sin DELETE a propósito (igual que el catálogo genérico, ver
// DT-017): el admin solo desactiva con activo=false.
export async function listarEstadosProspectoAdmin() {
  const { data } = await api.get('/catalogos/estados-prospecto/admin')
  return data
}
export async function crearEstadoProspecto(payload) {
  const { data } = await api.post('/catalogos/estados-prospecto', payload)
  return data
}
export async function actualizarEstadoProspecto(id, payload) {
  const { data } = await api.put(`/catalogos/estados-prospecto/${id}`, payload)
  return data
}

// ============================================================
// CATÁLOGO GENÉRICO (catalogo_tipo / catalogo_valor)
// Backend real desde el día 1 — sin patrón USE_MOCK (decisión
// explícita: ya existe backend probado, no hay nada que mockear
// mientras se construye esta pantalla).
// Endpoints: GET/POST /catalogos/tipos, GET/POST
// /catalogos/tipos/{codigo}/valores, PUT /catalogos/valores/{id}.
// Sin DELETE a propósito (ver DT-017 en docs/DEUDA.md): el admin
// solo desactiva un valor con activo=false.
// ============================================================

export async function listarTiposCatalogo() {
  const { data } = await api.get('/catalogos/tipos')
  return data
}

export async function crearTipoCatalogo(payload) {
  const { data } = await api.post('/catalogos/tipos', payload)
  return data
}

export async function listarValoresCatalogo(codigoTipo) {
  const { data } = await api.get(`/catalogos/tipos/${codigoTipo}/valores`)
  return data
}

export async function crearValorCatalogo(codigoTipo, payload) {
  const { data } = await api.post(`/catalogos/tipos/${codigoTipo}/valores`, payload)
  return data
}

export async function actualizarValorCatalogo(id, payload) {
  const { data } = await api.put(`/catalogos/valores/${id}`, payload)
  return data
}