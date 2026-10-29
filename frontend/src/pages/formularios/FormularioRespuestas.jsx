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

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { obtenerFormulario, listarRespuestas, listarVersiones, obtenerMetricas } from '../../api/formularios.js'
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

function formatoFechaCorta(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

// ── Panel de métricas básicas (GET /formularios/{id}/metricas) ──
function PanelMetricas({ metricas }) {
  const maxSerie = Math.max(1, ...metricas.serie_diaria.map((d) => d.total))

  return (
    <div id="metricas" className="metricas">
      <div className="metricas__tiles">
        <div className="metricas__tile">
          <span className="metricas__tile-valor">{metricas.total_respuestas}</span>
          <span className="metricas__tile-label">Total respuestas</span>
        </div>
        <div className="metricas__tile">
          <span className="metricas__tile-valor metricas__tile-valor--ok">{metricas.completadas}</span>
          <span className="metricas__tile-label">Completadas</span>
        </div>
        <div className="metricas__tile">
          <span className="metricas__tile-valor metricas__tile-valor--pendiente">{metricas.en_progreso}</span>
          <span className="metricas__tile-label">En progreso</span>
        </div>
        <div className="metricas__tile">
          <span className="metricas__tile-valor">{(metricas.tasa_completitud * 100).toFixed(0)}%</span>
          <span className="metricas__tile-label">Tasa de completitud</span>
        </div>
      </div>

      {metricas.serie_diaria.length > 0 && (
        <div className="metricas__serie">
          <span className="metricas__serie-titulo">Respuestas iniciadas por día</span>
          <div className="metricas__serie-barras">
            {metricas.serie_diaria.map((d) => (
              <div key={d.fecha} className="metricas__barra-col" title={`${d.total} el ${formatoFechaCorta(d.fecha)}`}>
                <div className="metricas__barra" style={{ height: `${(d.total / maxSerie) * 100}%` }} />
                <span className="metricas__barra-label">{formatoFechaCorta(d.fecha)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Agrupa preguntas sueltas + grupos en secciones, en el mismo
// orden real con el que se respondió (igual que construirEntradas/
// construirPaginas en FormularioPublico.jsx): una pregunta tipo
// "seccion" cierra la sección anterior y abre una con su título. ──
function construirSecciones(estructura) {
  const entradas = [
    ...estructura.preguntas
      .filter((p) => p.grupo_id === null)
      .map((p) => ({ tipo: 'pregunta', orden: Number(p.orden), data: p })),
    ...estructura.grupos.map((g) => ({
      tipo: 'grupo',
      orden: Number(g.orden),
      data: g,
      preguntas: estructura.preguntas.filter((p) => p.grupo_id === g.id),
    })),
  ].sort((a, b) => a.orden - b.orden)

  const secciones = [{ titulo: null, subtitulo: null, items: [] }]

  for (const entrada of entradas) {
    if (entrada.tipo === 'pregunta' && entrada.data.tipo_codigo === 'seccion') {
      secciones.push({ titulo: entrada.data.titulo, subtitulo: entrada.data.subtitulo, items: [] })
    } else {
      secciones[secciones.length - 1].items.push(entrada)
    }
  }

  return secciones[0].items.length === 0 && secciones.length > 1 ? secciones.slice(1) : secciones
}

// ── Traduce respuesta.respuestas (códigos) a algo legible usando
// la estructura de la versión con la que se envió. Preguntas
// numeradas y en negrita, agrupadas por sección cuando el
// formulario las tiene -- mismo criterio que el correo de Resend
// (ver backend/app/services/formulario_correo_html.py). ──
function DetalleRespuesta({ respuesta, estructura }) {
  if (!estructura) {
    return <p className="respuestas__sub">No se encontró la versión del formulario con la que se envió esta respuesta.</p>
  }

  const secciones = construirSecciones(estructura)
  const mostrarDivisores = secciones.length > 1

  // Numeración secuencial de preguntas sueltas a través de todo el
  // documento (no se reinicia por sección), sin mutar una variable
  // durante el render -- se resuelve por posición en esta lista.
  const ordenPreguntas = secciones.flatMap((s) =>
    s.items.filter((e) => e.tipo === 'pregunta').map((e) => e.data.codigo)
  )

  return (
    <div className="respuestas__detalle">
      {secciones.map((seccion, idxSeccion) => (
        <div key={idxSeccion} className="respuestas__seccion">
          {mostrarDivisores && (
            <div className="respuestas__seccion-divisor">
              <span className="respuestas__seccion-numero">Sección {idxSeccion + 1}</span>
              <span className="respuestas__seccion-titulo">{seccion.titulo}</span>
              {seccion.subtitulo && <span className="respuestas__seccion-subtitulo">{seccion.subtitulo}</span>}
            </div>
          )}

          {seccion.items.map((entrada) => {
            if (entrada.tipo === 'pregunta') {
              const p = entrada.data
              const numero = ordenPreguntas.indexOf(p.codigo) + 1
              return (
                <div key={p.codigo} className="respuestas__pregunta">
                  <span className="respuestas__pregunta-titulo">{numero}. {p.titulo}</span>
                  <span className="respuestas__pregunta-valor">{formatoValor(respuesta.respuestas[p.codigo])}</span>
                </div>
              )
            }

            const g = entrada.data
            const repeticiones = respuesta.respuestas[g.codigo]
            if (!Array.isArray(repeticiones) || repeticiones.length === 0) return null

            return (
              <div key={g.codigo} className="respuestas__grupo">
                {repeticiones.map((rep, i) => (
                  <div key={i} className="respuestas__grupo-item">
                    <span className="respuestas__grupo-item-numero">
                      <i className="bi bi-collection" /> {(g.titulo_template || g.codigo).replace('{n}', i + 1)}
                    </span>
                    {entrada.preguntas.map((p) => (
                      <div key={p.codigo} className="respuestas__pregunta respuestas__pregunta--grupo">
                        <span className="respuestas__pregunta-titulo">{p.titulo}</span>
                        <span className="respuestas__pregunta-valor">{formatoValor(rep[p.codigo])}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default function FormularioRespuestas() {
  const { id } = useParams()
  const location = useLocation()
  const metricasRef = useRef(null)

  const [formulario, setFormulario] = useState(null)
  const [respuestas, setRespuestas] = useState([])
  const [versiones, setVersiones]   = useState([])
  const [metricas, setMetricas]     = useState(null)
  const [cargando, setCargando]     = useState(true)
  const [error, setError]           = useState(null)
  const [abiertaId, setAbiertaId]   = useState(null)
  const [busqueda, setBusqueda]     = useState('')

  const cargar = useCallback(async () => {
    try {
      setCargando(true)
      setError(null)
      const [f, r, v, m] = await Promise.all([
        obtenerFormulario(id),
        listarRespuestas(id),
        listarVersiones(id),
        obtenerMetricas(id),
      ])
      setFormulario(f)
      setRespuestas(r)
      setVersiones(v)
      setMetricas(m)
    } catch (e) {
      setError('No se pudieron cargar las respuestas.')
      console.error('[FormularioRespuestas]', e)
    } finally {
      setCargando(false)
    }
  }, [id])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, mismo patrón que Prospectos.jsx (ver DT-018)
  useEffect(() => { cargar() }, [cargar])

  // Acceso rápido desde Formularios.jsx (.../respuestas#metricas): salta al panel sin recargar la página.
  useEffect(() => {
    if (location.hash === '#metricas' && !cargando && metricasRef.current) {
      metricasRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [location.hash, cargando])

  function estructuraDe(respuesta) {
    const version = versiones.find((v) => v.id === respuesta.formulario_version_id)
    return version?.estructura || null
  }

  const terminoBusqueda = busqueda.trim().toLowerCase()
  const respuestasFiltradas = terminoBusqueda
    ? respuestas.filter((r) =>
        (r.cliente_nombre || '').toLowerCase().includes(terminoBusqueda) ||
        (r.cliente_documento || '').toLowerCase().includes(terminoBusqueda)
      )
    : respuestas

  return (
    <div className="respuestas page-enter">
      <Link to="/admin/formularios" className="formbuilder__volver">
        <i className="bi bi-arrow-left" /> Formularios
      </Link>

      <div className="respuestas__header">
        <h2 className="formularios__titulo">{formulario ? `Respuestas — ${formulario.titulo}` : 'Respuestas'}</h2>
        <p className="formularios__sub">{respuestas.length} respuesta{respuestas.length !== 1 ? 's' : ''} recibidas</p>
      </div>

      {!error && !cargando && respuestas.length > 0 && (
        <div className="formularios__filtros">
          <div className="formularios__filtro-grupo">
            <label className="formularios__filtro-label" htmlFor="respuestas-busqueda">Buscar por nombre o documento</label>
            <div className="formularios__filtros-busqueda">
              <i className="bi bi-search" />
              <input
                id="respuestas-busqueda"
                type="text"
                placeholder="Nombre o número de documento"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button
                  type="button"
                  className="formularios__filtros-limpiar-input"
                  onClick={() => setBusqueda('')}
                  aria-label="Limpiar búsqueda"
                >
                  <i className="bi bi-x-lg" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!error && !cargando && metricas && (
        <div ref={metricasRef}>
          <PanelMetricas metricas={metricas} />
        </div>
      )}

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
      ) : respuestasFiltradas.length === 0 ? (
        <div className="formularios__vacio">
          <i className="bi bi-search" /> Ninguna respuesta coincide con "{busqueda}".
        </div>
      ) : (
        <div className="respuestas__lista">
          {respuestasFiltradas.map((r) => {
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
