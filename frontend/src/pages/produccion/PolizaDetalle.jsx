// ============================================================
// pages/produccion/PolizaDetalle.jsx
// Vista completa de una póliza individual
// Incluye: datos, historial de traspaso, acciones por rol
// ============================================================

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { obtenerPoliza, obtenerHistorialResponsable } from '../../api/polizas.js'
import './PolizaDetalle.css'

// ── Helpers ───────────────────────────────────────────────
function formatPrima(valor) {
  if (!valor && valor !== 0) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(valor)
}

function formatFecha(fecha) {
  if (!fecha) return '—'
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function formatFechaHora(fechaISO) {
  if (!fechaISO) return '—'
  return new Date(fechaISO).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function diasTranscurridos(fechaSolicitud, fechaExpedicion) {
  if (fechaExpedicion) return null
  const inicio = new Date(fechaSolicitud + 'T00:00:00')
  return Math.floor((new Date() - inicio) / (1000 * 60 * 60 * 24))
}

// ── Componente campo de dato ──────────────────────────────
function CampoDato({ label, valor, mono = false, acento = false }) {
  return (
    <div className="det-campo">
      <span className="det-campo__label">{label}</span>
      <span className={`det-campo__valor ${mono ? 'det-campo__valor--mono' : ''} ${acento ? 'det-campo__valor--acento' : ''}`}>
        {valor || <span className="det-campo__vacio">—</span>}
      </span>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`det-skeleton ${className}`} />
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function PolizaDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { esAdmin } = useAuth()

  const [poliza, setPoliza]       = useState(null)
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando]   = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      try {
        setCargando(true)
        setError(null)

        const [p, h] = await Promise.all([
          obtenerPoliza(id),
          obtenerHistorialResponsable(id),
        ])

        if (cancelado) return
        setPoliza(p)
        setHistorial(h)
      } catch (err) {
        if (cancelado) return
        if (err?.response?.status === 404) {
          setError('Póliza no encontrada.')
        } else {
          setError('No se pudo cargar la póliza. Intenta de nuevo.')
        }
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargar()
    return () => { cancelado = true }
  }, [id])

  // ── Error ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="det-error page-enter">
        <i className="bi bi-exclamation-circle" />
        <p>{error}</p>
        <button className="btn-secundario" onClick={() => navigate('/produccion')}>
          <i className="bi bi-arrow-left" /> Volver a producción
        </button>
      </div>
    )
  }

  const dias = poliza
    ? diasTranscurridos(poliza.fecha_solicitud, poliza.fecha_expedicion)
    : null

  return (
    <div className="det-wrap page-enter">

      {/* ── Barra de acciones superior ─────────────────── */}
      <div className="det-topbar">
        <button
          className="det-topbar__volver"
          onClick={() => navigate('/produccion')}
        >
          <i className="bi bi-arrow-left" />
          Producción
        </button>

        {!cargando && poliza && (
          <div className="det-topbar__acciones">
            <button
              className="btn-secundario"
              onClick={() => navigate(`/produccion/${id}/editar`)}
            >
              <i className="bi bi-pencil" /> Editar
            </button>
          </div>
        )}
      </div>

      {/* ── Encabezado de la póliza ────────────────────── */}
      {cargando ? (
        <Skeleton className="det-header-skeleton" />
      ) : poliza && (
        <div className="det-header">
          <div className="det-header__izq">
            <span className={`prod-badge prod-badge--${poliza.estado_color} det-header__badge`}>
              {poliza.estado}
            </span>
            <h2 className="det-header__nombre">{poliza.cliente_nombre}</h2>
            <span className="det-header__doc">
              {poliza.cliente_documento}
              {poliza.cliente_celular && (
                <> · <i className="bi bi-telephone" /> {poliza.cliente_celular}</>
              )}
            </span>
          </div>

          <div className="det-header__der">
            {poliza.numero_poliza ? (
              <span className="det-header__numero">{poliza.numero_poliza}</span>
            ) : (
              <span className="det-header__numero det-header__numero--pendiente">
                N° pendiente
              </span>
            )}
            {poliza.prima && (
              <span className="det-header__prima">{formatPrima(poliza.prima)}</span>
            )}
            {dias !== null && (
              <span className={`det-header__dias ${dias > 30 ? 'det-header__dias--critico' : dias > 15 ? 'det-header__dias--atencion' : ''}`}>
                <i className="bi bi-clock" /> {dias}d sin expedir
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Cuerpo: dos columnas ───────────────────────── */}
      <div className="det-cuerpo">

        {/* ── Columna principal ──────────────────────── */}
        <div className="det-col-principal">

          {/* Sección: datos del seguro */}
          {cargando ? <Skeleton className="det-seccion-skeleton" /> : poliza && (
            <div className="det-seccion">
              <div className="det-seccion__header">
                <i className="bi bi-shield-check" />
                <h3>Datos del seguro</h3>
              </div>
              <div className="det-grid">
                <CampoDato label="Aseguradora"  valor={poliza.aseguradora} acento />
                <CampoDato label="Producto"     valor={poliza.producto} />
                <CampoDato label="Ramo"         valor={poliza.ramo} />
                <CampoDato label="Asegurado"    valor={poliza.asegurado_nombre} />
                <CampoDato label="F. Solicitud" valor={formatFecha(poliza.fecha_solicitud)} />
                <CampoDato label="F. Expedición" valor={formatFecha(poliza.fecha_expedicion)} />
                {poliza.numero_poliza && (
                  <CampoDato label="N° Póliza" valor={poliza.numero_poliza} mono />
                )}
                {poliza.prima && (
                  <CampoDato label="Prima" valor={formatPrima(poliza.prima)} acento />
                )}
              </div>
            </div>
          )}

          {/* Sección: observaciones */}
          {cargando ? <Skeleton className="det-obs-skeleton" /> : poliza && poliza.observacion && (
            <div className="det-seccion">
              <div className="det-seccion__header">
                <i className="bi bi-chat-left-text" />
                <h3>Observaciones</h3>
              </div>
              <p className="det-obs">{poliza.observacion}</p>
            </div>
          )}

        </div>

        {/* ── Columna lateral ────────────────────────── */}
        <div className="det-col-lateral">

          {/* Responsable actual */}
          {cargando ? <Skeleton className="det-resp-skeleton" /> : poliza && (
            <div className="det-seccion">
              <div className="det-seccion__header">
                <i className="bi bi-person-badge" />
                <h3>Responsable</h3>
              </div>
              <div className="det-responsable">
                <div className="det-responsable__avatar">
                  {poliza.responsable_nombre
                    ?.split(' ')
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div className="det-responsable__info">
                  <span className="det-responsable__nombre">
                    {poliza.responsable_nombre || 'Sin asignar'}
                  </span>
                  <span className="det-responsable__label">Asesor responsable</span>
                </div>
              </div>
              {esAdmin && (
                <button
                  className="det-responsable__btn-traspaso"
                  onClick={() => navigate(`/produccion/${id}/editar`)}
                >
                  <i className="bi bi-arrow-left-right" />
                  Realizar traspaso
                </button>
              )}
            </div>
          )}

          {/* Metadatos */}
          {cargando ? <Skeleton className="det-meta-skeleton" /> : poliza && (
            <div className="det-seccion">
              <div className="det-seccion__header">
                <i className="bi bi-info-circle" />
                <h3>Información del registro</h3>
              </div>
              <div className="det-meta">
                <CampoDato label="ID interno" valor={`#${poliza.id}`} mono />
                <CampoDato label="Versión"    valor={`v${poliza.version}`} />
              </div>
            </div>
          )}

          {/* Historial de traspaso */}
          {cargando ? <Skeleton className="det-historial-skeleton" /> : (
            <div className="det-seccion">
              <div className="det-seccion__header">
                <i className="bi bi-arrow-left-right" />
                <h3>Historial de traspaso</h3>
              </div>

              {historial.length === 0 ? (
                <div className="det-historial__vacio">
                  <i className="bi bi-clock-history" />
                  <span>Sin traspasos registrados</span>
                </div>
              ) : (
                <div className="det-historial">
                  {historial.map((item, idx) => (
                    <div key={item.id} className="det-historial__item">
                      {/* Línea de tiempo */}
                      <div className="det-historial__linea">
                        <div className={`det-historial__punto det-historial__punto--${item.tipo === 'REASIGNACION' ? 'reasignacion' : 'traspaso'}`} />
                        {idx < historial.length - 1 && (
                          <div className="det-historial__conector" />
                        )}
                      </div>

                      <div className="det-historial__contenido">
                        <div className="det-historial__cabecera">
                          <span className={`det-historial__tipo det-historial__tipo--${item.tipo.toLowerCase()}`}>
                            {item.tipo === 'REASIGNACION' ? 'Reasignación' : 'Traspaso'}
                          </span>
                          <span className="det-historial__fecha">
                            {formatFechaHora(item.fecha)}
                          </span>
                        </div>

                        <div className="det-historial__flujo">
                          <span className="det-historial__asesor">
                            {item.nombre_anterior || 'Sin asignar'}
                          </span>
                          <i className="bi bi-arrow-right det-historial__flecha" />
                          <span className="det-historial__asesor det-historial__asesor--nuevo">
                            {item.nombre_nuevo}
                          </span>
                        </div>

                        {item.motivo && (
                          <p className="det-historial__motivo">"{item.motivo}"</p>
                        )}

                        {item.realizado_por && (
                          <span className="det-historial__por">
                            por {item.realizado_por}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}