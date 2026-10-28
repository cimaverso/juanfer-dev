// ============================================================
// src/components/ModalFormulariosRespondidos.jsx
// Modal reutilizable: formularios respondidos por un Cliente o
// un Prospecto (mismo shape de respuesta, distinto endpoint).
// GET /clientes/{id}/formularios-respondidos
// GET /prospectos/{id}/formularios-respondidos
// FormularioRespuestaRead no trae el título del formulario, solo
// formulario_id — se resuelve contra GET /formularios (admin).
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarFormularios } from '../api/formularios.js'
import './ModalFormulariosRespondidos.css'

function formatoFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function ModalFormulariosRespondidos({ nombre, obtenerRespuestas, onCerrar }) {
  const navigate = useNavigate()

  const [respuestas, setRespuestas] = useState([])
  const [titulos, setTitulos]       = useState({})
  const [cargando, setCargando]     = useState(true)
  const [error, setError]           = useState(null)

  const cargar = useCallback(async () => {
    try {
      setCargando(true)
      setError(null)
      const [r, formularios] = await Promise.all([
        obtenerRespuestas(),
        listarFormularios(),
      ])
      setRespuestas(r)
      setTitulos(Object.fromEntries(formularios.map((f) => [f.id, f.titulo])))
    } catch (e) {
      setError('No se pudieron cargar los formularios respondidos.')
      console.error('[ModalFormulariosRespondidos]', e)
    } finally {
      setCargando(false)
    }
  }, [obtenerRespuestas])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, mismo patrón que Formularios.jsx (ver DT-018)
  useEffect(() => { cargar() }, [cargar])

  return (
    <div className="mfr-overlay" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="mfr-modal" role="dialog" aria-modal="true" aria-label="Formularios respondidos">
        <div className="mfr-header">
          <span><i className="bi bi-file-earmark-text" /> Formularios respondidos{nombre ? ` — ${nombre}` : ''}</span>
          <button className="form-btn-icon" onClick={onCerrar} aria-label="Cerrar">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="mfr-body">
          {cargando ? (
            <p className="mfr-sub">Cargando…</p>
          ) : error ? (
            <div className="mfr-error">
              <i className="bi bi-wifi-off" />
              <p>{error}</p>
              <button className="form-btn-secundario" onClick={cargar}>
                <i className="bi bi-arrow-clockwise" /> Reintentar
              </button>
            </div>
          ) : respuestas.length === 0 ? (
            <p className="mfr-vacio">
              <i className="bi bi-inbox" /> Todavía no ha respondido ningún formulario.
            </p>
          ) : (
            <ul className="mfr-lista">
              {respuestas.map((r) => (
                <li key={r.id} className="mfr-item">
                  <div className="mfr-item__info">
                    <span className="mfr-item__titulo">{titulos[r.formulario_id] || `Formulario #${r.formulario_id}`}</span>
                    <span className="mfr-item__fecha">{formatoFecha(r.completado_at || r.iniciado_at)}</span>
                  </div>
                  <span className={`form-badge ${r.estado.codigo === 'completada' ? 'form-badge--activo' : 'form-badge--borrador'}`}>
                    {r.estado.nombre}
                  </span>
                  <button
                    className="form-btn-icon"
                    title="Ver respuestas de este formulario"
                    onClick={() => navigate(`/admin/formularios/${r.formulario_id}/respuestas`)}
                  >
                    <i className="bi bi-box-arrow-up-right" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
