// ============================================================
// api/dashboard.js
// Métricas para M6 — Dashboard y Control (REQ-18)
// En modo mock: calcula sobre MOCK_POLIZAS en el cliente.
// En backend real: un solo endpoint devuelve todo calculado
//   GET /api/v1/dashboard/metricas?responsable_id=&mes=&anio=
// ============================================================

import api, { USE_MOCK } from './axios.js'
import { MOCK_POLIZAS } from '../mocks/polizas.mock.js'

const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms))

// ============================================================
// MÉTRICAS PRINCIPALES (REQ-18)
// Devuelve el objeto completo que necesita Dashboard.jsx
// params: { responsable_id?, mes?, anio? }
// ============================================================
export async function obtenerMetricasDashboard(params = {}) {
  if (USE_MOCK) {
    await delay()
    return _calcularMetricasMock(params)
  }

  const { data } = await api.get('/dashboard/metricas', { params })
  return data
}

// ============================================================
// ALERTAS ACTIVAS (config_alerta — BD v2.0)
// Pólizas sin expedición que superan umbral de días
// ============================================================
export async function obtenerAlertas(params = {}) {
  if (USE_MOCK) {
    await delay(250)
    return _calcularAlertasMock()
  }

  const { data } = await api.get('/dashboard/alertas', { params })
  return data
}

// ============================================================
// PRODUCCIÓN POR MES (gráfico de barras en dashboard)
// Devuelve array [{ mes, total_polizas, prima_total }]
// ============================================================
export async function obtenerProduccionMensual(params = {}) {
  if (USE_MOCK) {
    await delay(300)
    return _calcularProduccionMensualMock()
  }

  const { data } = await api.get('/dashboard/produccion-mensual', { params })
  return data
}

// ============================================================
// DISTRIBUCIÓN POR ESTADO (gráfico de dona)
// ============================================================
export async function obtenerDistribucionEstados() {
  if (USE_MOCK) {
    await delay(200)
    return _calcularDistribucionMock()
  }

  const { data } = await api.get('/dashboard/distribucion-estados')
  return data
}

// ─────────────────────────────────────────────────────────────
// HELPERS DE CÁLCULO MOCK
// ─────────────────────────────────────────────────────────────

function _calcularMetricasMock(params = {}) {
  let polizas = [...MOCK_POLIZAS]

  // Filtrar por responsable si se solicita (vista asesor)
  if (params.responsable_id) {
    polizas = polizas.filter(
      (p) => p.responsable_id === parseInt(params.responsable_id)
    )
  }

  const hoy = new Date()

  // Totales por estado
  const expedidas = polizas.filter((p) => p.estado === 'Expedido')
  const enProceso = polizas.filter((p) =>
    ['En proceso de firma', 'Evaluación médica', 'Pendiente de complemento'].includes(p.estado)
  )
  const pospuestas = polizas.filter((p) => p.estado === 'Pospuesto')
  const declinadas = polizas.filter((p) => p.estado === 'Declinado')
  const canceladas = polizas.filter((p) => p.estado === 'Cancelado')

  // Prima total de expedidas (producción neta)
  const primaTotal = expedidas.reduce((sum, p) => sum + (p.prima || 0), 0)

  // Pólizas sin expedición > 7 días (alerta)
  const sinExpedicion = polizas.filter((p) => {
    if (p.fecha_expedicion) return false
    const diasDesde = _diasDesde(p.fecha_solicitud, hoy)
    return diasDesde > 7
  })

  // Tasa de éxito: expedidas / (expedidas + declinadas + canceladas)
  const cerradas = expedidas.length + declinadas.length + canceladas.length
  const tasaExito = cerradas > 0 ? Math.round((expedidas.length / cerradas) * 100) : 0

  // Producción del mes actual
  const mesActual = hoy.getMonth()
  const anioActual = hoy.getFullYear()
  const polizasMes = expedidas.filter((p) => {
    const f = new Date(p.fecha_expedicion)
    return f.getMonth() === mesActual && f.getFullYear() === anioActual
  })
  const primaMes = polizasMes.reduce((sum, p) => sum + (p.prima || 0), 0)

  return {
    // Conteos
    total_polizas:      polizas.length,
    expedidas:          expedidas.length,
    en_proceso:         enProceso.length,
    pospuestas:         pospuestas.length,
    declinadas:         declinadas.length,
    canceladas:         canceladas.length,

    // Financiero
    prima_total:        primaTotal,
    prima_mes:          primaMes,
    polizas_mes:        polizasMes.length,

    // Alertas
    sin_expedicion:     sinExpedicion.length,
    alertas_criticas:   sinExpedicion.filter(
      (p) => _diasDesde(p.fecha_solicitud, hoy) > 30
    ).length,

    // Calidad
    tasa_exito:         tasaExito,

    // Meta (hardcodeada en mock, en backend viene de config)
    meta_prima_mes:     2000000,
    meta_polizas_mes:   15,
  }
}

function _calcularAlertasMock() {
  const hoy = new Date()

  return MOCK_POLIZAS
    .filter((p) => !p.fecha_expedicion && p.estado !== 'Cancelado' && p.estado !== 'Declinado')
    .map((p) => {
      const dias = _diasDesde(p.fecha_solicitud, hoy)
      return {
        poliza_id:      p.id,
        cliente_nombre: p.cliente_nombre,
        estado:         p.estado,
        responsable:    p.responsable_nombre,
        dias_sin_exp:   dias,
        nivel:          dias > 30 ? 'critico' : dias > 15 ? 'atencion' : 'info',
      }
    })
    .filter((a) => a.dias_sin_exp > 7)
    .sort((a, b) => b.dias_sin_exp - a.dias_sin_exp)
}

function _calcularProduccionMensualMock() {
  // Agrupa pólizas expedidas por mes de fecha_expedicion
  const porMes = {}

  MOCK_POLIZAS.forEach((p) => {
    if (!p.fecha_expedicion) return
    const f = new Date(p.fecha_expedicion)
    const clave = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`

    if (!porMes[clave]) {
      porMes[clave] = { mes: clave, total_polizas: 0, prima_total: 0 }
    }
    porMes[clave].total_polizas++
    porMes[clave].prima_total += p.prima || 0
  })

  return Object.values(porMes).sort((a, b) => a.mes.localeCompare(b.mes))
}

function _calcularDistribucionMock() {
  const conteo = {}

  MOCK_POLIZAS.forEach((p) => {
    if (!conteo[p.estado]) {
      conteo[p.estado] = { estado: p.estado, color: p.estado_color, cantidad: 0 }
    }
    conteo[p.estado].cantidad++
  })

  return Object.values(conteo).sort((a, b) => b.cantidad - a.cantidad)
}

// ── Utilidad: días entre dos fechas ──────────────────────
function _diasDesde(fechaStr, hasta = new Date()) {
  const desde = new Date(fechaStr)
  return Math.floor((hasta - desde) / (1000 * 60 * 60 * 24))
}