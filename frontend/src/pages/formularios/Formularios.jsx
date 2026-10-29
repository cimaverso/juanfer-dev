// ============================================================
// src/pages/formularios/Formularios.jsx
// Listado de formularios dinámicos (admin). Desde aquí se crea
// uno nuevo (navega al builder), se publica, se ve la URL
// pública y se ven las respuestas.
// Datos: api/formularios.js
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listarFormularios,
  crearFormulario,
  actualizarFormulario,
  eliminarFormulario,
  importarFormularios,
} from '../../api/formularios.js'
import { listarValoresCatalogo } from '../../api/catalogos.js'
import Toast from '../../components/Toast.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import './Formularios.css'

const NUEVO_VACIO = { titulo: '', descripcion: '', categoria_codigo: '' }

function urlPublica(token) {
  return `${window.location.origin}/f/${token}`
}

function BadgeEstado({ estado }) {
  const clase = {
    borrador: 'form-badge--borrador',
    activo: 'form-badge--activo',
    archivado: 'form-badge--archivado',
  }[estado.codigo] || 'form-badge--borrador'

  return <span className={`form-badge ${clase}`}>{estado.nombre}</span>
}

function BadgeCategoria({ categoria }) {
  const clase = {
    cotizacion: 'form-badge--cotizacion',
    expedicion: 'form-badge--expedicion',
  }[categoria.codigo] || 'form-badge--cotizacion'

  return <span className={`form-badge ${clase}`}>{categoria.nombre}</span>
}

export default function Formularios() {
  const navigate = useNavigate()

  const [formularios, setFormularios] = useState([])
  const [cargando, setCargando]       = useState(true)
  const [error, setError]             = useState(null)

  const [categorias, setCategorias]   = useState([])
  const [estados, setEstados]         = useState([])

  const [modalAbierto, setModalAbierto] = useState(false)
  const [nuevo, setNuevo]             = useState(NUEVO_VACIO)
  const [creando, setCreando]         = useState(false)
  const [errorCrear, setErrorCrear]   = useState(null)

  const [modalImportarAbierto, setModalImportarAbierto] = useState(false)
  const [archivosImportar, setArchivosImportar] = useState([])
  const [importando, setImportando]       = useState(false)
  const [errorImportar, setErrorImportar] = useState(null)
  const [resultadoImportar, setResultadoImportar] = useState(null)

  const [copiadoId, setCopiadoId]     = useState(null)
  const [toast, setToast]             = useState(null)
  const [confirmacion, setConfirmacion] = useState(null)

  // ── Filtros ───────────────────────────────────────────
  const [busqueda, setBusqueda]             = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroEstado, setFiltroEstado]     = useState('')
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('')
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('')

  // Búsqueda con debounce de 350ms (mismo patrón que Prospectos.jsx)
  const [busquedaDebounced, setBusquedaDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 350)
    return () => clearTimeout(t)
  }, [busqueda])

  const cargar = useCallback(async () => {
    try {
      setCargando(true)
      setError(null)
      const data = await listarFormularios({
        titulo: busquedaDebounced || undefined,
        categoria_codigo: filtroCategoria || undefined,
        estado_codigo: filtroEstado || undefined,
        fecha_desde: filtroFechaDesde || undefined,
        fecha_hasta: filtroFechaHasta || undefined,
      })
      setFormularios(data)
    } catch (e) {
      setError('No se pudieron cargar los formularios.')
      console.error('[Formularios]', e)
    } finally {
      setCargando(false)
    }
  }, [busquedaDebounced, filtroCategoria, filtroEstado, filtroFechaDesde, filtroFechaHasta])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount/filtros, mismo patrón que Prospectos.jsx (ver DT-018)
  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    listarValoresCatalogo('formulario_categoria').then(setCategorias).catch(() => {})
    listarValoresCatalogo('formulario_estado').then(setEstados).catch(() => {})
  }, [])

  function limpiarFiltros() {
    setBusqueda('')
    setFiltroCategoria('')
    setFiltroEstado('')
    setFiltroFechaDesde('')
    setFiltroFechaHasta('')
  }

  async function handleCrear(e) {
    e.preventDefault()
    if (!nuevo.titulo.trim()) {
      setErrorCrear('El título es obligatorio.')
      return
    }
    if (!nuevo.categoria_codigo) {
      setErrorCrear('La categoría es obligatoria.')
      return
    }
    try {
      setCreando(true)
      setErrorCrear(null)
      const creado = await crearFormulario({
        titulo: nuevo.titulo.trim(),
        descripcion: nuevo.descripcion.trim() || null,
        categoria_codigo: nuevo.categoria_codigo,
      })
      navigate(`/admin/formularios/${creado.id}/editar`)
    } catch (err) {
      setErrorCrear(err.response?.data?.detail || 'No se pudo crear el formulario.')
    } finally {
      setCreando(false)
    }
  }

  function cerrarModalImportar() {
    setModalImportarAbierto(false)
    setArchivosImportar([])
    setErrorImportar(null)
    setResultadoImportar(null)
  }

  async function handleImportar(e) {
    e.preventDefault()
    if (archivosImportar.length === 0) {
      setErrorImportar('Selecciona al menos un archivo JSON.')
      return
    }
    try {
      setImportando(true)
      setErrorImportar(null)
      setResultadoImportar(null)

      const items = await Promise.all(
        archivosImportar.map(async (archivo) => {
          try {
            return JSON.parse(await archivo.text())
          } catch {
            throw new Error(`"${archivo.name}" no es un JSON válido.`)
          }
        })
      )

      const resultado = await importarFormularios(items)
      setResultadoImportar(resultado)
      if (resultado.creados.length > 0) cargar()
    } catch (err) {
      setErrorImportar(err.response?.data?.detail || err.message || 'No se pudo importar.')
    } finally {
      setImportando(false)
    }
  }

  function handleEliminar(id) {
    setConfirmacion({
      mensaje: '¿Eliminar este formulario? Esta acción no se puede deshacer.',
      onConfirmar: async () => {
        setConfirmacion(null)
        try {
          await eliminarFormulario(id)
          setFormularios((prev) => prev.filter((f) => f.id !== id))
        } catch (err) {
          const detalle = err.response?.data?.detail
          setToast({
            tipo: 'error',
            mensaje: detalle === 'No se puede eliminar: el formulario ya tiene respuestas'
              ? 'No se puede eliminar: este formulario ya tiene respuestas registradas.'
              : (detalle || 'No se pudo eliminar el formulario.'),
          })
        }
      },
    })
  }

  // Archivar o volver a borrador invalida la URL pública vieja (el
  // backend genera un token_publico nuevo al cambiar de estado, ver
  // FormularioService.actualizar) -- se avisa antes de confirmar.
  function handleCambiarEstado(f, estadoCodigo, mensaje) {
    setConfirmacion({
      mensaje,
      textoConfirmar: estadoCodigo === 'archivado' ? 'Archivar' : 'Volver a borrador',
      onConfirmar: async () => {
        setConfirmacion(null)
        try {
          const actualizado = await actualizarFormulario(f.id, { estado_codigo: estadoCodigo })
          setFormularios((prev) => prev.map((x) => (x.id === f.id ? actualizado : x)))
        } catch (err) {
          setToast({ tipo: 'error', mensaje: err.response?.data?.detail || 'No se pudo cambiar el estado.' })
        }
      },
    })
  }

  function copiarUrl(token, id) {
    navigator.clipboard.writeText(urlPublica(token)).then(() => {
      setCopiadoId(id)
      setTimeout(() => setCopiadoId(null), 1500)
    })
  }

  return (
    <div className="formularios page-enter">
      <div className="formularios__header">
        <div>
          <h2 className="formularios__titulo">Formularios</h2>
          <p className="formularios__sub">Diseña formularios dinámicos y compártelos por URL pública.</p>
        </div>
        <div className="formularios__header-acciones">
          <button className="form-btn-secundario" onClick={() => setModalImportarAbierto(true)}>
            <i className="bi bi-upload" /> Importar
          </button>
          <button className="form-btn-primario" onClick={() => setModalAbierto(true)}>
            <i className="bi bi-plus-lg" /> Nuevo formulario
          </button>
        </div>
      </div>

      <div className="formularios__filtros">
        <div className="formularios__filtro-grupo">
          <label className="formularios__filtro-label" htmlFor="filtro-titulo">Buscar</label>
          <div className="formularios__filtros-busqueda">
            <i className="bi bi-search" />
            <input
              id="filtro-titulo"
              type="text"
              placeholder="Título del formulario…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className="formularios__filtros-limpiar-input" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda">
                <i className="bi bi-x" />
              </button>
            )}
          </div>
        </div>

        <div className="formularios__filtro-grupo">
          <label className="formularios__filtro-label" htmlFor="filtro-categoria">Categoría</label>
          <select id="filtro-categoria" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.codigo}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <div className="formularios__filtro-grupo">
          <label className="formularios__filtro-label" htmlFor="filtro-estado">Estado</label>
          <select id="filtro-estado" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            {estados.map((e) => (
              <option key={e.id} value={e.codigo}>{e.nombre}</option>
            ))}
          </select>
        </div>

        <div className="formularios__filtro-grupo">
          <label className="formularios__filtro-label" htmlFor="filtro-fecha-desde">Creado desde</label>
          <input
            id="filtro-fecha-desde"
            type="date"
            value={filtroFechaDesde}
            onChange={(e) => setFiltroFechaDesde(e.target.value)}
          />
        </div>

        <div className="formularios__filtro-grupo">
          <label className="formularios__filtro-label" htmlFor="filtro-fecha-hasta">Creado hasta</label>
          <input
            id="filtro-fecha-hasta"
            type="date"
            value={filtroFechaHasta}
            onChange={(e) => setFiltroFechaHasta(e.target.value)}
          />
        </div>

        {(busqueda || filtroCategoria || filtroEstado || filtroFechaDesde || filtroFechaHasta) && (
          <button className="formularios__filtros-reset formularios__filtros-reset--grupo" onClick={limpiarFiltros}>
            <i className="bi bi-funnel" /> Limpiar filtros
          </button>
        )}
      </div>

      {error ? (
        <div className="formularios__error">
          <i className="bi bi-wifi-off" />
          <p>{error}</p>
          <button className="form-btn-secundario" onClick={cargar}>
            <i className="bi bi-arrow-clockwise" /> Reintentar
          </button>
        </div>
      ) : (
        <div className="formularios__tabla-wrap">
          <table className="formularios__tabla">
            <thead>
              <tr>
                <th>Título</th>
                <th>Categoría</th>
                <th>Estado</th>
                <th style={{ width: '1%' }}># Preguntas</th>
                <th>Creado</th>
                <th style={{ width: '1%' }}>URL pública</th>
                <th style={{ width: '1%' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}><td colSpan={7} className="formularios__skeleton-fila" /></tr>
                  ))
                : formularios.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} className="formularios__vacio">
                        <i className="bi bi-file-earmark-text" /> No hay formularios con estos filtros
                      </td>
                    </tr>
                  )
                  : formularios.map((f) => (
                    <tr key={f.id} className="formularios__fila" onClick={() => navigate(`/admin/formularios/${f.id}/editar`)}>
                      <td>
                        <span className="formularios__nombre">{f.titulo}</span>
                        {f.descripcion && <span className="formularios__descripcion">{f.descripcion}</span>}
                      </td>
                      <td><BadgeCategoria categoria={f.categoria} /></td>
                      <td><BadgeEstado estado={f.estado} /></td>
                      <td className="formularios__n-preguntas">{f.n_preguntas}</td>
                      <td>{new Date(f.created_at).toLocaleDateString('es-CO')}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {f.estado.codigo === 'activo' ? (
                          <button
                            className="form-btn-icon"
                            title="Copiar URL pública"
                            onClick={() => copiarUrl(f.token_publico, f.id)}
                          >
                            <i className={`bi ${copiadoId === f.id ? 'bi-check-lg' : 'bi-link-45deg'}`} />
                          </button>
                        ) : (
                          <span className="formularios__sin-publicar" title="Publica el formulario para obtener su URL">—</span>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="formularios__acciones">
                          <button
                            className="form-btn-icon"
                            title="Ver respuestas y métricas"
                            onClick={() => navigate(`/admin/formularios/${f.id}/respuestas`)}
                          >
                            <i className="bi bi-inbox" />
                          </button>
                          {f.estado.codigo === 'activo' && (
                            <button
                              className="form-btn-icon"
                              title="Archivar (deja de poder responderse; invalida la URL pública)"
                              onClick={() => handleCambiarEstado(
                                f, 'archivado',
                                'Al archivar este formulario ya no se podrá responder y su URL pública actual quedará invalidada. ¿Continuar?'
                              )}
                            >
                              <i className="bi bi-archive" />
                            </button>
                          )}
                          {f.estado.codigo === 'archivado' && (
                            <button
                              className="form-btn-icon"
                              title="Volver a borrador (también invalida la URL pública)"
                              onClick={() => handleCambiarEstado(
                                f, 'borrador',
                                'Al volver a borrador la URL pública actual quedará invalidada; tendrás que publicar de nuevo para obtener una nueva. ¿Continuar?'
                              )}
                            >
                              <i className="bi bi-arrow-counterclockwise" />
                            </button>
                          )}
                          <button
                            className="form-btn-icon"
                            title="Editar"
                            onClick={() => navigate(`/admin/formularios/${f.id}/editar`)}
                          >
                            <i className="bi bi-pencil" />
                          </button>
                          <button
                            className="form-btn-icon form-btn-icon--danger"
                            title="Eliminar"
                            onClick={() => handleEliminar(f.id)}
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      )}

      {modalAbierto && (
        <div className="formularios__modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalAbierto(false)}>
          <div className="formularios__modal" role="dialog" aria-modal="true" aria-label="Nuevo formulario">
            <div className="formularios__modal-header">
              <span><i className="bi bi-file-earmark-plus" /> Nuevo formulario</span>
              <button className="form-btn-icon" onClick={() => setModalAbierto(false)} aria-label="Cerrar">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <form className="formularios__modal-body" onSubmit={handleCrear}>
              <label className="formularios__label">
                Título
                <input
                  type="text"
                  autoFocus
                  value={nuevo.titulo}
                  onChange={(e) => setNuevo((p) => ({ ...p, titulo: e.target.value }))}
                  placeholder="Ej. Solicitud de seguro de vida"
                />
              </label>
              <label className="formularios__label">
                Descripción (opcional)
                <textarea
                  value={nuevo.descripcion}
                  onChange={(e) => setNuevo((p) => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Texto introductorio que verá quien lo diligencie"
                  rows={3}
                />
              </label>
              <label className="formularios__label">
                Categoría
                <select
                  value={nuevo.categoria_codigo}
                  onChange={(e) => setNuevo((p) => ({ ...p, categoria_codigo: e.target.value }))}
                >
                  <option value="">Selecciona una categoría…</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.codigo}>{c.nombre}</option>
                  ))}
                </select>
              </label>
              {errorCrear && <p className="form-error-msg">{errorCrear}</p>}
              <div className="formularios__modal-footer">
                <button type="button" className="form-btn-secundario" onClick={() => setModalAbierto(false)}>
                  Cancelar
                </button>
                <button type="submit" className="form-btn-primario" disabled={creando}>
                  {creando ? 'Creando…' : 'Crear y continuar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalImportarAbierto && (
        <div className="formularios__modal-overlay" onClick={(e) => e.target === e.currentTarget && cerrarModalImportar()}>
          <div className="formularios__modal formularios__modal--ancho" role="dialog" aria-modal="true" aria-label="Importar formularios">
            <div className="formularios__modal-header">
              <span><i className="bi bi-upload" /> Importar desde Microsoft Forms</span>
              <button className="form-btn-icon" onClick={cerrarModalImportar} aria-label="Cerrar">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <form className="formularios__modal-body" onSubmit={handleImportar}>
              <p className="formularios__importar-ayuda">
                Selecciona uno o varios archivos JSON exportados de Microsoft Forms. La categoría
                (cotización/expedición) se detecta sola desde el título de cada formulario.
              </p>
              <label className="formularios__label">
                Archivos JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  multiple
                  onChange={(e) => {
                    setArchivosImportar(Array.from(e.target.files))
                    setResultadoImportar(null)
                  }}
                />
              </label>
              {archivosImportar.length > 0 && (
                <ul className="formularios__importar-lista-archivos">
                  {archivosImportar.map((a) => (
                    <li key={a.name}><i className="bi bi-filetype-json" /> {a.name}</li>
                  ))}
                </ul>
              )}

              {errorImportar && <p className="form-error-msg">{errorImportar}</p>}

              {resultadoImportar && (
                <div className="formularios__importar-resultado">
                  {resultadoImportar.creados.map((r) => (
                    <div key={r.formulario_id} className="formularios__importar-item formularios__importar-item--ok">
                      <i className="bi bi-check-circle" />
                      <div>
                        <strong>{r.titulo}</strong>
                        {(r.sin_mapear.length > 0 || r.branching_sin_resolver.length > 0 || r.duplicados_omitidos.length > 0 || r.campos_criticos_agregados.length > 0) && (
                          <span className="formularios__importar-detalle">
                            Creado — revisa: {r.sin_mapear.length} campo(s) sin código conocido,{' '}
                            {r.branching_sin_resolver.length} salto(s) sin resolver,{' '}
                            {r.duplicados_omitidos.length} duplicado(s) omitido(s).
                            {r.campos_criticos_agregados.length > 0 && (
                              <>
                                {' '}El formulario original no preguntaba {r.campos_criticos_agregados.join(', ')} del tomador — se agregó como pregunta obligatoria.
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {resultadoImportar.fallidos.map((r, i) => (
                    <div key={i} className="formularios__importar-item formularios__importar-item--error">
                      <i className="bi bi-x-circle" />
                      <div>
                        <strong>{r.titulo}</strong>
                        <span className="formularios__importar-detalle">{r.motivo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="formularios__modal-footer">
                <button type="button" className="form-btn-secundario" onClick={cerrarModalImportar}>
                  Cerrar
                </button>
                <button type="submit" className="form-btn-primario" disabled={importando}>
                  {importando ? 'Importando…' : 'Importar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast toast={toast} onCerrar={() => setToast(null)} />
      <ConfirmDialog confirmacion={confirmacion} onCancelar={() => setConfirmacion(null)} />
    </div>
  )
}
