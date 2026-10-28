// ============================================================
// src/pages/formularios/FormularioRespuestas.jsx
// Respuestas recibidas de un formulario, mostradas de forma
// legible (etiqueta: valor) — nada de JSON crudo. Cada respuesta
// se interpreta contra la versión publicada con la que se envió
// (version.estructura), para traducir códigos de pregunta a su
// título real y agrupar las repeticiones de los grupos.
// Ruta: /admin/formularios/:id/respuestas
// Datos: api/formularios.js
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { obtenerFormulario, listarRespuestas, listarVersiones } from '../../api/formularios.js'
import './Formularios.css'
import './FormularioRespuestas.css'

function formatoValor(valor) {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (Array.isArray(valor)) return valor.length ? valor.join(', ') : '—'
  return String(valor)
}

function formatoFecha(iso) {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

// ── Traduce respuesta.respuestas (códigos) a algo legible usando
// la estructura de la versión con la que se envió ──
function DetalleRespuesta({ respuesta, estructura }) {
  if (!estructura) {
    return <p className="respuestas__sub">No se encontró la versión del formulario con la que se envió esta respuesta.</p>
  }

  const sueltas = estructura.preguntas.filter((p) => p.grupo_id === null)
  const grupos = estructura.grupos

  return (
    <div className="respuestas__detalle">
      {sueltas.length > 0 && (
        <div className="respuestas__bloque">
          {sueltas.map((p) => (
            <div key={p.codigo} className="respuestas__campo">
              <span className="respuestas__campo-label">{p.titulo}</span>
              <span className="respuestas__campo-valor">{formatoValor(respuesta.respuestas[p.codigo])}</span>
            </div>
          ))}
        </div>
      )}

      {grupos.map((g) => {
        const repeticiones = respuesta.respuestas[g.codigo]
        if (!Array.isArray(repeticiones) || repeticiones.length === 0) return null
        const preguntasGrupo = estructura.preguntas.filter((p) => p.grupo_id === g.id)

        return (
          <div key={g.codigo} className="respuestas__grupo">
            <h4 className="respuestas__grupo-titulo"><i className="bi bi-collection" /> {g.titulo_template}</h4>
            <div className="respuestas__grupo-items">
              {repeticiones.map((rep, i) => (
                <div key={i} className="respuestas__grupo-item">
                  <span className="respuestas__grupo-item-numero">{g.titulo_template} {i + 1}</span>
                  {preguntasGrupo.map((p) => (
                    <div key={p.codigo} className="respuestas__campo">
                      <span className="respuestas__campo-label">{p.titulo}</span>
                      <span className="respuestas__campo-valor">{formatoValor(rep[p.codigo])}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function FormularioRespuestas() {
  const { id } = useParams()

  const [formulario, setFormulario] = useState(null)
  const [respuestas, setRespuestas] = useState([])
  const [versiones, setVersiones]   = useState([])
  const [cargando, setCargando]     = useState(true)
  const [error, setError]           = useState(null)
  const [abiertaId, setAbiertaId]   = useState(null)

  const cargar = useCallback(async () => {
    try {
      setCargando(true)
      setError(null)
      const [f, r, v] = await Promise.all([
        obtenerFormulario(id),
        listarRespuestas(id),
        listarVersiones(id),
      ])
      setFormulario(f)
      setRespuestas(r)
      setVersiones(v)
    } catch (e) {
      setError('No se pudieron cargar las respuestas.')
      console.error('[FormularioRespuestas]', e)
    } finally {
      setCargando(false)
    }
  }, [id])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, mismo patrón que Prospectos.jsx (ver DT-018)
  useEffect(() => { cargar() }, [cargar])

  function estructuraDe(respuesta) {
    const version = versiones.find((v) => v.id === respuesta.formulario_version_id)
    return version?.estructura || null
  }

  return (
    <div className="respuestas page-enter">
      <Link to="/admin/formularios" className="formbuilder__volver">
        <i className="bi bi-arrow-left" /> Formularios
      </Link>

      <div className="respuestas__header">
        <h2 className="formularios__titulo">{formulario ? `Respuestas — ${formulario.titulo}` : 'Respuestas'}</h2>
        <p className="formularios__sub">{respuestas.length} respuesta{respuestas.length !== 1 ? 's' : ''} recibidas</p>
      </div>

      {error ? (
        <div className="formularios__error">
          <i className="bi bi-wifi-off" />
          <p>{error}</p>
          <button className="form-btn-secundario" onClick={cargar}>
            <i className="bi bi-arrow-clockwise" /> Reintentar
          </button>
        </div>
      ) : cargando ? (
        <p className="formularios__sub">Cargando…</p>
      ) : respuestas.length === 0 ? (
        <div className="formularios__vacio">
          <i className="bi bi-inbox" /> Todavía no hay respuestas para este formulario.
        </div>
      ) : (
        <div className="respuestas__lista">
          {respuestas.map((r) => {
            const abierta = abiertaId === r.id
            return (
              <div key={r.id} className="respuestas__item">
                <button className="respuestas__item-header" onClick={() => setAbiertaId(abierta ? null : r.id)}>
                  <i className={`bi ${abierta ? 'bi-chevron-down' : 'bi-chevron-right'}`} />
                  <div className="respuestas__item-info">
                    <span className="respuestas__item-nombre">{r.cliente_nombre || 'Sin nombre'}</span>
                    <span className="respuestas__item-doc">{r.cliente_documento || '—'}</span>
                  </div>
                  <span className="form-badge form-badge--activo">{r.estado.nombre}</span>
                  <span className="respuestas__item-fecha">{formatoFecha(r.completado_at || r.iniciado_at)}</span>
                </button>
                {abierta && <DetalleRespuesta respuesta={r} estructura={estructuraDe(r)} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
