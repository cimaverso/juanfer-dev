// ============================================================
// src/pages/prospectos/ProspectoDetalle.jsx
// M3 — Detalle de prospecto
// Ruta: /prospectos/:id
// Contiene: datos, timeline de contactos, cadencia,
//           cambio de estado, conversión a póliza
// ============================================================

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  obtenerProspecto,
  avanzarContacto,
  cambiarEstadoProspecto,
  convertirProspecto,
  ESTADOS_PIPELINE,
  CADENCIA_DIAS,
  CANALES_ORIGEN,
} from '../../api/prospectos.js'
import './ProspectoDetalle.css'

// ── Helpers ───────────────────────────────────────────────
function formatFechaLarga(iso) {
  if (!iso) return '—'
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatFechaCorta(iso) {
  if (!iso) return '—'
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

function diasDesde(iso) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso + 'T00:00:00').getTime()
  return Math.floor(diff / 86400000)
}

function clasificarProximoContacto(fechaStr) {
  if (!fechaStr) return null
  const hoy = new Date().toISOString().split('T')[0]
  if (fechaStr < hoy)  return 'vencida'
  if (fechaStr === hoy) return 'hoy'
  return 'futura'
}

// Color del pipeline
const COLOR_PIPELINE = {
  'contacto-1': '#3B6CB7', 'contacto-2': '#378ADD',
  'contacto-3': '#1D9E75', 'contacto-4': '#5DCAA5',
  'contacto-5': '#639922', 'contacto-6': '#97C459',
  'contacto-7': '#888780', 'cotizacion': '#BA7517',
  'firma':      '#D85A30', 'evaluacion': '#993556',
  'convertido': '#0F6E56', 'descartado': '#5F5E5A',
}

// Genera el timeline de contactos a partir de intentos_contacto y fecha_primer_contacto
function generarTimelineContactos(prospecto) {
  if (!prospecto.fecha_primer_contacto) return []
  const items = []
  const base = new Date(prospecto.fecha_primer_contacto + 'T00:00:00')

  for (let i = 0; i < Math.max(prospecto.intentos_contacto, 1); i++) {
    const diasOffset = CADENCIA_DIAS[i] ?? (CADENCIA_DIAS[CADENCIA_DIAS.length - 1] + (i - CADENCIA_DIAS.length + 1) * 2)
    const fecha = new Date(base.getTime() + diasOffset * 86400000)
    const realizado = i < prospecto.intentos_contacto
    items.push({
      numero:    i + 1,
      fecha:     fecha.toISOString().split('T')[0],
      realizado,
      esFecha:   realizado
        ? (i === prospecto.intentos_contacto - 1 ? prospecto.fecha_ultimo_contacto : fecha.toISOString().split('T')[0])
        : null,
    })
  }
  return items
}

// ── Modal confirmación conversión ─────────────────────────
function ModalConvertir({ prospecto, onCerrar, onConfirmar, cargando }) {
  return (
    <div className="pdet-overlay" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="pdet-modal" role="dialog" aria-modal="true">
        <div className="pdet-modal__icono">
          <i className="bi bi-arrow-right-circle" />
        </div>
        <h3 className="pdet-modal__titulo">Convertir a póliza</h3>
        <p className="pdet-modal__texto">
          Vas a crear una póliza para <strong>{prospecto.nombre}</strong>.
          Los datos del prospecto se precargarán en el formulario. Podrás
          completar número de póliza, prima y fecha de expedición después.
        </p>
        <div className="pdet-modal__acciones">
          <button className="btn-secundario" onClick={onCerrar} disabled={cargando}>
            Cancelar
          </button>
          <button className="btn-primario" onClick={onConfirmar} disabled={cargando}>
            {cargando
              ? <><div className="pdet-btn-spinner" /> Procesando…</>
              : <><i className="bi bi-check-lg" /> Confirmar conversión</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal cambio de estado ────────────────────────────────
function ModalCambioEstado({ estadoActual, onCerrar, onCambiar, cargando }) {
  const [estadoSeleccionado, setEstadoSeleccionado] = useState(String(estadoActual))

  // Estados disponibles para cambio manual (excluye los de contacto 1-7, esos van con avanzarContacto)
  const ESTADOS_MANUALES = ESTADOS_PIPELINE.filter(
    (e) => !e.color.startsWith('contacto-')
  )

  return (
    <div className="pdet-overlay" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="pdet-modal" role="dialog" aria-modal="true">
        <div className="pdet-modal__header">
          <span className="pdet-modal__titulo-sm">Cambiar estado del pipeline</span>
          <button className="pdet-modal__cerrar" onClick={onCerrar} aria-label="Cerrar">
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <div className="pdet-estados-lista">
          {ESTADOS_MANUALES.map((e) => (
            <button
              key={e.id}
              className={`pdet-estado-opcion ${estadoSeleccionado === String(e.id) ? 'pdet-estado-opcion--activo' : ''}`}
              onClick={() => setEstadoSeleccionado(String(e.id))}
              style={{ '--ec': COLOR_PIPELINE[e.color] ?? '#888' }}
            >
              <span className="pdet-estado-opcion__dot" />
              {e.nombre}
              {estadoSeleccionado === String(e.id) && <i className="bi bi-check" />}
            </button>
          ))}
        </div>
        <div className="pdet-modal__acciones">
          <button className="btn-secundario" onClick={onCerrar} disabled={cargando}>Cancelar</button>
          <button
            className="btn-primario"
            onClick={() => onCambiar(Number(estadoSeleccionado))}
            disabled={cargando || estadoSeleccionado === String(estadoActual)}
          >
            {cargando ? <><div className="pdet-btn-spinner" /> Guardando…</> : 'Guardar estado'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function ProspectoDetalle() {
  const { id }          = useParams()
  const navigate        = useNavigate()
  const { esAdmin }     = useAuth()

  const [prospecto, setProspecto]         = useState(null)
  const [cargando, setCargando]           = useState(true)
  const [error, setError]                 = useState(null)
  const [modalConvertir, setModalConvertir] = useState(false)
  const [modalEstado, setModalEstado]     = useState(false)
  const [accionando, setAccionando]       = useState(false)
  const [mensajeExito, setMensajeExito]   = useState(null)

  // ── Carga del prospecto ───────────────────────────────
  useEffect(() => {
    let cancelado = false
    async function cargar() {
      try {
        setCargando(true)
        setError(null)
        const p = await obtenerProspecto(id)
        if (!cancelado) setProspecto(p)
      } catch (e) {
        if (!cancelado) setError('No se encontró el prospecto o hubo un error.')
        console.error('[ProspectoDetalle]', e)
      } finally {
        if (!cancelado) setCargando(false)
      }
    }
    cargar()
    return () => { cancelado = true }
  }, [id])

  // Limpia mensaje de éxito tras 3s
  useEffect(() => {
    if (!mensajeExito) return
    const t = setTimeout(() => setMensajeExito(null), 3000)
    return () => clearTimeout(t)
  }, [mensajeExito])

  // ── Acciones ──────────────────────────────────────────
  async function handleAvanzarContacto() {
    if (accionando) return
    setAccionando(true)
    try {
      const actualizado = await avanzarContacto(id)
      setProspecto(actualizado)
      setMensajeExito('Contacto registrado correctamente.')
    } catch (e) {
      console.error('[avanzarContacto]', e)
    } finally {
      setAccionando(false)
    }
  }

  async function handleCambiarEstado(nuevoEstadoId) {
    setAccionando(true)
    try {
      const actualizado = await cambiarEstadoProspecto(id, nuevoEstadoId)
      setProspecto(actualizado)
      setModalEstado(false)
      setMensajeExito('Estado actualizado.')
    } catch (e) {
      console.error('[cambiarEstado]', e)
    } finally {
      setAccionando(false)
    }
  }

  async function handleConvertir() {
    setAccionando(true)
    try {
      const { poliza_id } = await convertirProspecto(id)
      setModalConvertir(false)
      // Navega al PolizaForm con query param para precargar datos
      navigate(`/produccion/nueva?desde_prospecto=${id}`)
    } catch (e) {
      console.error('[convertirProspecto]', e)
      setAccionando(false)
    }
  }

  // ── Estados de página ─────────────────────────────────
  if (cargando) {
    return (
      <div className="pdet-loading">
        <div className="pdet-spinner" />
        <span>Cargando prospecto…</span>
      </div>
    )
  }

  if (error || !prospecto) {
    return (
      <div className="pdet-error-page">
        <i className="bi bi-person-x" />
        <p>{error ?? 'Prospecto no encontrado.'}</p>
        <button className="btn-secundario" onClick={() => navigate('/prospectos')}>
          <i className="bi bi-arrow-left" /> Volver a prospectos
        </button>
      </div>
    )
  }

  // ── Datos derivados ───────────────────────────────────
  const timeline       = generarTimelineContactos(prospecto)
  const esConvertido   = prospecto.estado_color === 'convertido'
  const esDescartado   = prospecto.estado_color === 'descartado'
  const colorEstado    = COLOR_PIPELINE[prospecto.estado_color] ?? '#888'
  const claseProximo   = clasificarProximoContacto(prospecto.proximo_contacto)
  const diasSinContacto = diasDesde(prospecto.fecha_ultimo_contacto ?? prospecto.fecha_primer_contacto)
  const canalLabel     = CANALES_ORIGEN.find((c) => c.value === prospecto.canal_origen)?.label ?? prospecto.canal_origen

  return (
    <div className="pdet page-enter">

      {/* ── Toast éxito ── */}
      {mensajeExito && (
        <div className="pdet-toast" role="status">
          <i className="bi bi-check-circle-fill" /> {mensajeExito}
        </div>
      )}

      {/* ── Encabezado ── */}
      <div className="pdet-header">
        <button className="pdet-back" onClick={() => navigate('/prospectos')} aria-label="Volver">
          <i className="bi bi-arrow-left" />
        </button>

        <div className="pdet-header__info">
          <div className="pdet-avatar" aria-hidden="true">
            {prospecto.nombre.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
          </div>
          <div>
            <h2 className="pdet-header__nombre">{prospecto.nombre}</h2>
            <div className="pdet-header__meta">
              <span>{prospecto.tipo_documento_id === 1 ? 'CC' : 'Doc.'} {prospecto.numero_documento}</span>
              <span className="pdet-sep">·</span>
              <span>{prospecto.telefono}</span>
              {prospecto.correo && (
                <>
                  <span className="pdet-sep">·</span>
                  <span>{prospecto.correo}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="pdet-header__acciones">
          {/* Editar */}
          {!esConvertido && (
            <button
              className="btn-secundario btn-sm"
              onClick={() => navigate(`/prospectos/${id}/editar`)}
            >
              <i className="bi bi-pencil" /> Editar
            </button>
          )}

          {/* Convertir a póliza */}
          {!esConvertido && !esDescartado && (
            <button
              className="btn-primario btn-sm"
              onClick={() => setModalConvertir(true)}
            >
              <i className="bi bi-arrow-right-circle" /> Convertir a póliza
            </button>
          )}

          {/* Si ya fue convertido: ir a la póliza */}
          {esConvertido && prospecto.poliza_id && (
            <button
              className="btn-verde btn-sm"
              onClick={() => navigate(`/produccion/${prospecto.poliza_id}`)}
            >
              <i className="bi bi-file-earmark-check" /> Ver póliza creada
            </button>
          )}
        </div>
      </div>

      {/* ── Cuerpo — dos columnas ── */}
      <div className="pdet-body">

        {/* ════ COLUMNA IZQUIERDA ════ */}
        <div className="pdet-col-izq">

          {/* Panel: estado del pipeline */}
          <div className="pdet-panel">
            <div className="pdet-panel__header">
              <span className="pdet-panel__titulo">
                <i className="bi bi-diagram-3" /> Estado del pipeline
              </span>
              {!esConvertido && (
                <button
                  className="pdet-link"
                  onClick={() => setModalEstado(true)}
                >
                  Cambiar <i className="bi bi-chevron-right" />
                </button>
              )}
            </div>

            <div className="pdet-estado-actual" style={{ '--ec': colorEstado }}>
              <span className="pdet-estado-actual__dot" />
              <span className="pdet-estado-actual__nombre">{prospecto.estado_nombre}</span>
            </div>

            {/* Barra de progreso del pipeline */}
            {!esConvertido && !esDescartado && (
              <div className="pdet-progreso">
                <div className="pdet-progreso__barra">
                  <div
                    className="pdet-progreso__fill"
                    style={{
                      width: `${Math.round((prospecto.intentos_contacto / 7) * 100)}%`,
                      background: colorEstado,
                    }}
                  />
                </div>
                <span className="pdet-progreso__texto">
                  {prospecto.intentos_contacto} de 7 contactos realizados
                </span>
              </div>
            )}

            {esConvertido && (
              <div className="pdet-estado-convertido">
                <i className="bi bi-check-circle-fill" />
                Prospecto convertido exitosamente
              </div>
            )}
          </div>

          {/* Panel: próximo contacto + acción rápida */}
          {!esConvertido && !esDescartado && (
            <div className="pdet-panel">
              <div className="pdet-panel__header">
                <span className="pdet-panel__titulo">
                  <i className="bi bi-clock" /> Seguimiento
                </span>
              </div>

              {/* Próximo contacto */}
              <div className={`pdet-proximo pdet-proximo--${claseProximo ?? 'nulo'}`}>
                <div className="pdet-proximo__icono">
                  <i className={`bi bi-${
                    claseProximo === 'vencida' ? 'exclamation-triangle-fill' :
                    claseProximo === 'hoy'     ? 'bell-fill' :
                    'calendar-check'
                  }`} />
                </div>
                <div className="pdet-proximo__info">
                  <span className="pdet-proximo__label">
                    {claseProximo === 'vencida' ? 'Contacto vencido' :
                     claseProximo === 'hoy'     ? 'Contactar hoy' :
                     'Próximo contacto'}
                  </span>
                  <span className="pdet-proximo__fecha">
                    {prospecto.proximo_contacto
                      ? formatFechaLarga(prospecto.proximo_contacto)
                      : 'Sin fecha programada'}
                  </span>
                </div>
              </div>

              {diasSinContacto !== null && (
                <p className="pdet-dias-sin-contacto">
                  <i className="bi bi-clock-history" />
                  Último contacto hace <strong>{diasSinContacto}</strong> día{diasSinContacto !== 1 ? 's' : ''}
                </p>
              )}

              {/* Botón acción principal */}
              <button
                className="pdet-btn-contacto"
                onClick={handleAvanzarContacto}
                disabled={accionando}
              >
                {accionando
                  ? <><div className="pdet-btn-spinner" /> Registrando…</>
                  : <><i className="bi bi-telephone-forward" /> Marcar contacto {prospecto.intentos_contacto + 1}</>
                }
              </button>
            </div>
          )}

          {/* Panel: datos personales */}
          <div className="pdet-panel">
            <div className="pdet-panel__header">
              <span className="pdet-panel__titulo">
                <i className="bi bi-person-vcard" /> Datos personales
              </span>
            </div>
            <dl className="pdet-dl">
              {prospecto.ocupacion && (
                <>
                  <dt>Ocupación</dt>
                  <dd>{prospecto.ocupacion}</dd>
                </>
              )}
              {prospecto.ciudad && (
                <>
                  <dt>Ciudad</dt>
                  <dd>{prospecto.ciudad}</dd>
                </>
              )}
              <dt>Canal de origen</dt>
              <dd>
                <span className={`pdet-canal pdet-canal--${prospecto.canal_origen}`}>
                  {canalLabel}
                </span>
              </dd>
              <dt>Asesor responsable</dt>
              <dd>{prospecto.responsable_nombre}</dd>
              {(prospecto.aseguradora_interes_nombre || prospecto.ramo_interes_nombre) && (
                <>
                  <dt>Interés comercial</dt>
                  <dd>
                    {[prospecto.ramo_interes_nombre, prospecto.aseguradora_interes_nombre]
                      .filter(Boolean).join(' · ')}
                  </dd>
                </>
              )}
              <dt>Registrado</dt>
              <dd>{formatFechaLarga(prospecto.created_at)}</dd>
            </dl>
          </div>

          {/* Panel: observaciones */}
          {prospecto.observaciones && (
            <div className="pdet-panel">
              <div className="pdet-panel__header">
                <span className="pdet-panel__titulo">
                  <i className="bi bi-chat-left-quote" /> Observaciones
                </span>
              </div>
              <p className="pdet-observaciones">{prospecto.observaciones}</p>
            </div>
          )}
        </div>

        {/* ════ COLUMNA DERECHA ════ */}
        <div className="pdet-col-der">

          {/* Timeline de contactos */}
          <div className="pdet-panel">
            <div className="pdet-panel__header">
              <span className="pdet-panel__titulo">
                <i className="bi bi-list-check" /> Historial de contactos
              </span>
              <span className="pdet-panel__badge">
                {prospecto.intentos_contacto} / 7
              </span>
            </div>

            {timeline.length === 0 ? (
              <p className="pdet-vacio">Sin contactos registrados aún.</p>
            ) : (
              <ol className="pdet-timeline">
                {timeline.map((item) => (
                  <li
                    key={item.numero}
                    className={`pdet-timeline__item ${
                      item.realizado
                        ? 'pdet-timeline__item--hecho'
                        : 'pdet-timeline__item--pendiente'
                    }`}
                  >
                    <div className="pdet-timeline__dot">
                      {item.realizado
                        ? <i className="bi bi-check" />
                        : <span>{item.numero}</span>
                      }
                    </div>
                    <div className="pdet-timeline__contenido">
                      <span className="pdet-timeline__label">
                        Contacto {item.numero}
                      </span>
                      <span className="pdet-timeline__fecha">
                        {item.realizado
                          ? `Realizado · ${formatFechaCorta(item.esFecha)}`
                          : `Programado · ${formatFechaCorta(item.fecha)}`
                        }
                      </span>
                    </div>
                  </li>
                ))}

                {/* Ítem siguiente si no está completo */}
                {!esConvertido && !esDescartado && prospecto.proximo_contacto && (
                  <li className={`pdet-timeline__item pdet-timeline__item--proximo pdet-timeline__item--${claseProximo ?? 'futura'}`}>
                    <div className="pdet-timeline__dot pdet-timeline__dot--proximo">
                      <i className="bi bi-telephone" />
                    </div>
                    <div className="pdet-timeline__contenido">
                      <span className="pdet-timeline__label">
                        Contacto {prospecto.intentos_contacto + 1} — próximo
                      </span>
                      <span className="pdet-timeline__fecha">
                        {claseProximo === 'hoy'     ? 'Hoy' :
                         claseProximo === 'vencida' ? `Vencido · ${formatFechaCorta(prospecto.proximo_contacto)}` :
                         formatFechaCorta(prospecto.proximo_contacto)}
                      </span>
                    </div>
                  </li>
                )}
              </ol>
            )}
          </div>

          {/* Panel: info de conversión si ya fue convertido */}
          {esConvertido && prospecto.poliza_id && (
            <div className="pdet-panel pdet-panel--convertido">
              <div className="pdet-panel__header">
                <span className="pdet-panel__titulo">
                  <i className="bi bi-file-earmark-check" /> Póliza creada
                </span>
              </div>
              <p className="pdet-conv-texto">
                Este prospecto fue convertido exitosamente. La póliza #{prospecto.poliza_id} fue creada y está disponible en el módulo de producción.
              </p>
              <button
                className="btn-verde btn-sm"
                onClick={() => navigate(`/produccion/${prospecto.poliza_id}`)}
              >
                <i className="bi bi-arrow-right" /> Ir a la póliza
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ── Modales ── */}
      {modalConvertir && (
        <ModalConvertir
          prospecto={prospecto}
          onCerrar={() => setModalConvertir(false)}
          onConfirmar={handleConvertir}
          cargando={accionando}
        />
      )}

      {modalEstado && (
        <ModalCambioEstado
          estadoActual={prospecto.estado_id}
          onCerrar={() => setModalEstado(false)}
          onCambiar={handleCambiarEstado}
          cargando={accionando}
        />
      )}
    </div>
  )
}