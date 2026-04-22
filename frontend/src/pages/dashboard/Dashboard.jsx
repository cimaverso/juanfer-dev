// ============================================================
// pages/dashboard/Dashboard.jsx
// M6 — Dashboard y Control (REQ-18)
// Datos: api/dashboard.js (mock→real sin cambiar este archivo)
// ============================================================

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  obtenerMetricasDashboard,
  obtenerAlertas,
  obtenerProduccionMensual,
  obtenerDistribucionEstados,
} from '../../api/dashboard.js'
import './Dashboard.css'

// ── Helpers ───────────────────────────────────────────────
function formatPrima(valor) {
  if (!valor && valor !== 0) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor)
}

function formatMes(claveYYYYMM) {
  const [anio, mes] = claveYYYYMM.split('-')
  const nombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${nombres[parseInt(mes) - 1]} ${anio}`
}

function porcentaje(valor, total) {
  if (!total) return 0
  return Math.round((valor / total) * 100)
}

// ── Componente tarjeta de métrica ─────────────────────────
function TarjetaMetrica({ icono, titulo, valor, sub, color, animDelay = 0 }) {
  return (
    <div
      className={`dash-metrica dash-metrica--${color}`}
      style={{ animationDelay: `${animDelay}ms` }}
    >
      <div className="dash-metrica__icono">
        <i className={`bi ${icono}`} />
      </div>
      <div className="dash-metrica__cuerpo">
        <span className="dash-metrica__valor">{valor}</span>
        <span className="dash-metrica__titulo">{titulo}</span>
        {sub && <span className="dash-metrica__sub">{sub}</span>}
      </div>
    </div>
  )
}

// ── Componente barra de progreso con meta ─────────────────
function BarraMeta({ label, actual, meta, formatear = (v) => v }) {
  const pct = Math.min(porcentaje(actual, meta), 100)
  const superada = actual >= meta
  return (
    <div className="dash-meta">
      <div className="dash-meta__header">
        <span className="dash-meta__label">{label}</span>
        <span className={`dash-meta__valor ${superada ? 'dash-meta__valor--ok' : ''}`}>
          {formatear(actual)}
          <span className="dash-meta__de"> / {formatear(meta)}</span>
        </span>
      </div>
      <div className="dash-meta__barra-wrap">
        <div
          className={`dash-meta__barra ${superada ? 'dash-meta__barra--ok' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="dash-meta__pct">{pct}% de la meta</span>
    </div>
  )
}

// ── Componente alerta individual ──────────────────────────
function ItemAlerta({ alerta, onVerPoliza }) {
  const nivelLabel = { critico: 'Crítico', atencion: 'Atención', info: 'Info' }
  return (
    <div className={`dash-alerta dash-alerta--${alerta.nivel}`}>
      <div className="dash-alerta__icono">
        <i className={`bi ${
          alerta.nivel === 'critico' ? 'bi-exclamation-triangle-fill' :
          alerta.nivel === 'atencion' ? 'bi-clock-history' :
          'bi-info-circle'
        }`} />
      </div>
      <div className="dash-alerta__cuerpo">
        <span className="dash-alerta__cliente">{alerta.cliente_nombre}</span>
        <span className="dash-alerta__detalle">
          {alerta.estado} · {alerta.responsable} · <strong>{alerta.dias_sin_exp}d</strong> sin expedir
        </span>
      </div>
      <span className={`dash-alerta__badge dash-alerta__badge--${alerta.nivel}`}>
        {nivelLabel[alerta.nivel]}
      </span>
      <button
        className="dash-alerta__btn"
        onClick={() => onVerPoliza(alerta.poliza_id)}
        title="Ver póliza"
      >
        <i className="bi bi-arrow-right" />
      </button>
    </div>
  )
}

// ── Componente gráfico de barras simple (CSS puro) ────────
function GraficoBarras({ datos }) {
  if (!datos.length) return <div className="dash-grafico__vacio">Sin datos</div>

  const maxPrima = Math.max(...datos.map((d) => d.prima_total))

  return (
    <div className="dash-grafico">
      {datos.map((d) => (
        <div key={d.mes} className="dash-grafico__columna">
          <span className="dash-grafico__valor">
            {d.prima_total > 0 ? `$${(d.prima_total / 1000).toFixed(0)}k` : '—'}
          </span>
          <div className="dash-grafico__barra-wrap">
            <div
              className="dash-grafico__barra"
              style={{ height: `${maxPrima > 0 ? porcentaje(d.prima_total, maxPrima) : 0}%` }}
              title={`${formatPrima(d.prima_total)} · ${d.total_polizas} pólizas`}
            />
          </div>
          <span className="dash-grafico__mes">{formatMes(d.mes)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Componente distribución por estado ────────────────────
function DistribucionEstados({ datos, total }) {
  return (
    <div className="dash-dist">
      {datos.map((d) => (
        <div key={d.estado} className="dash-dist__fila">
          <div className="dash-dist__info">
            <span className={`dash-dist__punto dash-dist__punto--${d.color}`} />
            <span className="dash-dist__estado">{d.estado}</span>
          </div>
          <div className="dash-dist__barra-wrap">
            <div
              className={`dash-dist__barra dash-dist__barra--${d.color}`}
              style={{ width: `${porcentaje(d.cantidad, total)}%` }}
            />
          </div>
          <span className="dash-dist__cant">{d.cantidad}</span>
        </div>
      ))}
    </div>
  )
}

// ── Esqueleto de carga ────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`dash-skeleton ${className}`} />
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function Dashboard() {
  const { usuario, esAdmin } = useAuth()
  const navigate = useNavigate()

  const [metricas, setMetricas]       = useState(null)
  const [alertas, setAlertas]         = useState([])
  const [produccion, setProduccion]   = useState([])
  const [distribucion, setDistribucion] = useState([])
  const [cargando, setCargando]       = useState(true)
  const [error, setError]             = useState(null)

  // Vista: ADMIN ve todo, ASESOR ve solo su cartera
  const paramsFiltro = esAdmin ? {} : { responsable_id: usuario?.id }

  useEffect(() => {
    let cancelado = false

    async function cargarDatos() {
      try {
        setCargando(true)
        setError(null)

        const [m, a, p, d] = await Promise.all([
          obtenerMetricasDashboard(paramsFiltro),
          obtenerAlertas(paramsFiltro),
          obtenerProduccionMensual(paramsFiltro),
          obtenerDistribucionEstados(),
        ])

        if (cancelado) return

        setMetricas(m)
        setAlertas(a)
        setProduccion(p)
        setDistribucion(d)
      } catch (err) {
        if (!cancelado) setError('No se pudieron cargar las métricas. Intenta de nuevo.')
        console.error('[Dashboard]', err)
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargarDatos()
    return () => { cancelado = true }
  }, [usuario?.id, esAdmin])

  // ── Error state ──────────────────────────────────────────
  if (error) {
    return (
      <div className="dash-error page-enter">
        <i className="bi bi-wifi-off" />
        <p>{error}</p>
        <button className="btn-primario" onClick={() => window.location.reload()}>
          <i className="bi bi-arrow-clockwise" /> Reintentar
        </button>
      </div>
    )
  }

  const saludo = _saludo(usuario?.nombre)

  return (
    <div className="dashboard page-enter">

      {/* ── Encabezado ──────────────────────────────────── */}
      <div className="dash-header">
        <div>
          <h2 className="dash-header__saludo">{saludo}</h2>
          <p className="dash-header__sub">
            {esAdmin
              ? 'Vista general de toda la operación'
              : 'Tu cartera de pólizas activas'}
          </p>
        </div>
        {alertas.length > 0 && (
          <div className="dash-header__alerta-pill">
            <i className="bi bi-exclamation-triangle-fill" />
            {alertas.filter((a) => a.nivel === 'critico').length > 0
              ? `${alertas.filter((a) => a.nivel === 'critico').length} alertas críticas`
              : `${alertas.length} pólizas sin expedir`}
          </div>
        )}
      </div>

      {/* ── Tarjetas de métricas ─────────────────────────── */}
      <div className="dash-metricas">
        {cargando ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="dash-metrica-skeleton" />
          ))
        ) : (
          <>
            <TarjetaMetrica
              icono="bi-file-earmark-text"
              titulo="Total pólizas"
              valor={metricas.total_polizas}
              sub={`${metricas.polizas_mes} este mes`}
              color="azul"
              animDelay={0}
            />
            <TarjetaMetrica
              icono="bi-patch-check"
              titulo="Expedidas"
              valor={metricas.expedidas}
              sub={`${metricas.tasa_exito}% tasa de éxito`}
              color="verde"
              animDelay={60}
            />
            <TarjetaMetrica
              icono="bi-hourglass-split"
              titulo="En proceso"
              valor={metricas.en_proceso}
              sub="requieren seguimiento"
              color="amarillo"
              animDelay={120}
            />
            <TarjetaMetrica
              icono="bi-currency-dollar"
              titulo="Prima total"
              valor={formatPrima(metricas.prima_total)}
              sub={`${formatPrima(metricas.prima_mes)} este mes`}
              color="navy"
              animDelay={180}
            />
            <TarjetaMetrica
              icono="bi-bell"
              titulo="Sin expedir"
              valor={metricas.sin_expedicion}
              sub={metricas.alertas_criticas > 0 ? `${metricas.alertas_criticas} críticas` : 'al día'}
              color={metricas.alertas_criticas > 0 ? 'rojo' : 'gris'}
              animDelay={240}
            />
          </>
        )}
      </div>

      {/* ── Fila central: gráfico + distribución ─────────── */}
      <div className="dash-fila">

        {/* Producción mensual */}
        <div className="dash-panel dash-panel--grande">
          <div className="dash-panel__header">
            <div className="dash-panel__titulo-wrap">
              <i className="bi bi-bar-chart" />
              <h3 className="dash-panel__titulo">Producción mensual</h3>
            </div>
            <span className="dash-panel__hint">Prima expedida por mes</span>
          </div>
          {cargando
            ? <Skeleton className="dash-grafico-skeleton" />
            : <GraficoBarras datos={produccion} />
          }
        </div>

        {/* Distribución por estado */}
        <div className="dash-panel dash-panel--chico">
          <div className="dash-panel__header">
            <div className="dash-panel__titulo-wrap">
              <i className="bi bi-pie-chart" />
              <h3 className="dash-panel__titulo">Por estado</h3>
            </div>
          </div>
          {cargando
            ? <Skeleton className="dash-dist-skeleton" />
            : <DistribucionEstados datos={distribucion} total={metricas?.total_polizas || 0} />
          }
        </div>
      </div>

      {/* ── Fila inferior: metas + alertas ───────────────── */}
      <div className="dash-fila">

        {/* Metas del mes */}
        <div className="dash-panel dash-panel--chico">
          <div className="dash-panel__header">
            <div className="dash-panel__titulo-wrap">
              <i className="bi bi-bullseye" />
              <h3 className="dash-panel__titulo">Metas del mes</h3>
            </div>
          </div>
          {cargando ? (
            <Skeleton className="dash-metas-skeleton" />
          ) : (
            <div className="dash-metas">
              <BarraMeta
                label="Pólizas expedidas"
                actual={metricas.polizas_mes}
                meta={metricas.meta_polizas_mes}
                formatear={(v) => `${v} pólizas`}
              />
              <BarraMeta
                label="Prima acumulada"
                actual={metricas.prima_mes}
                meta={metricas.meta_prima_mes}
                formatear={formatPrima}
              />
            </div>
          )}
        </div>

        {/* Alertas activas */}
        <div className="dash-panel dash-panel--grande">
          <div className="dash-panel__header">
            <div className="dash-panel__titulo-wrap">
              <i className="bi bi-exclamation-triangle" />
              <h3 className="dash-panel__titulo">Pólizas sin expedir</h3>
            </div>
            {alertas.length > 0 && (
              <button
                className="dash-panel__link"
                onClick={() => navigate('/produccion')}
              >
                Ver todas <i className="bi bi-arrow-right" />
              </button>
            )}
          </div>
          {cargando ? (
            <Skeleton className="dash-alertas-skeleton" />
          ) : alertas.length === 0 ? (
            <div className="dash-alertas__vacio">
              <i className="bi bi-check-circle" />
              <span>Todo al día — sin alertas activas</span>
            </div>
          ) : (
            <div className="dash-alertas">
              {alertas.slice(0, 5).map((a) => (
                <ItemAlerta
                  key={a.poliza_id}
                  alerta={a}
                  onVerPoliza={(id) => navigate(`/produccion/${id}`)}
                />
              ))}
              {alertas.length > 5 && (
                <button
                  className="dash-alertas__mas"
                  onClick={() => navigate('/produccion')}
                >
                  Ver {alertas.length - 5} más en producción
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ── Helper saludo ─────────────────────────────────────────
function _saludo(nombre) {
  const hora = new Date().getHours()
  const base = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'
  const pNombre = nombre ? `, ${nombre.split(' ')[0]}` : ''
  return `${base}${pNombre}`
}