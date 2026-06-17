// ============================================================
// src/pages/prospectos/Prospectos.jsx
// M3 — Listado de prospectos + pipeline strip
// Datos: api/prospectos.js (mock→real sin cambiar este archivo)
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  listarProspectos,
  obtenerResumenPipeline,
  avanzarContacto,
  cambiarEstadoProspecto,
  parsearArchivoProspectos,
  importarProspectos,
  descargarPlantillaImportacion,
  ESTADOS_PIPELINE,
  CANALES_ORIGEN,
} from '../../api/prospectos.js'
import './Prospectos.css'

// ── Constantes ────────────────────────────────────────────
const LIMITE_PAGINA = 15

// Colores del semáforo de pipeline — deben coincidir con Prospectos.css
const COLOR_PIPELINE = {
  'contacto-1':  '#3B6CB7',
  'contacto-2':  '#378ADD',
  'contacto-3':  '#1D9E75',
  'contacto-4':  '#5DCAA5',
  'contacto-5':  '#639922',
  'contacto-6':  '#97C459',
  'contacto-7':  '#888780',
  'cotizacion':  '#BA7517',
  'firma':       '#D85A30',
  'evaluacion':  '#993556',
  'convertido':  '#0F6E56',
  'descartado':  '#5F5E5A',
}

// ── Helpers ───────────────────────────────────────────────
function clasificarFecha(fechaStr) {
  if (!fechaStr) return null
  const hoy  = new Date().toISOString().split('T')[0]
  if (fechaStr < hoy)  return 'vencida'
  if (fechaStr === hoy) return 'hoy'
  return 'futura'
}

function formatFecha(fechaStr) {
  if (!fechaStr) return '—'
  const [, mes, dia] = fechaStr.split('-')
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${parseInt(dia)} ${meses[parseInt(mes) - 1]}`
}

function BadgeCanal({ canal }) {
  return <span className={`prosp-canal prosp-canal--${canal}`}>{CANALES_ORIGEN.find(c => c.value === canal)?.label ?? canal}</span>
}

function BadgeEstado({ color, nombre }) {
  const hex = COLOR_PIPELINE[color] ?? '#888780'
  return (
    <span className="prosp-badge-estado" style={{ '--estado-color': hex }}>
      <span className="prosp-badge-estado__dot" />
      {nombre}
    </span>
  )
}

function Skeleton() {
  return (
    <tr className="prosp-skeleton-row">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i}><div className="prosp-skeleton" /></td>
      ))}
    </tr>
  )
}

// ── Modal de importación ──────────────────────────────────
function ModalImportacion({ onCerrar, onImportado }) {
  const [fase, setFase]         = useState('inicio') // inicio | preview | importando | resultado
  const [filas, setFilas]       = useState([])
  const [resultado, setResultado] = useState(null)
  const [error, setError]       = useState(null)
  const [arrastre, setArrastre] = useState(false)
  const inputRef = useRef()

  async function procesarArchivo(archivo) {
    setError(null)
    try {
      const parsed = await parsearArchivoProspectos(archivo)
      if (!parsed.length) {
        setError('El archivo no contiene filas válidas.')
        return
      }
      setFilas(parsed)
      setFase('preview')
    } catch (e) {
      setError(e.message)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setArrastre(false)
    const f = e.dataTransfer.files[0]
    if (f) procesarArchivo(f)
  }

  async function confirmarImportacion() {
    setFase('importando')
    try {
      const res = await importarProspectos(filas)
      setResultado(res)
      setFase('resultado')
      if (res.importados > 0) onImportado()
    } catch (e) {
      setError(e.message)
      setFase('preview')
    }
  }

  async function bajarPlantilla() {
    try {
      await descargarPlantillaImportacion()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="prosp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="prosp-modal" role="dialog" aria-modal="true" aria-label="Importar prospectos">

        <div className="prosp-modal__header">
          <span className="prosp-modal__titulo">
            <i className="bi bi-upload" /> Importar prospectos
          </span>
          <button className="prosp-modal__cerrar" onClick={onCerrar} aria-label="Cerrar">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* ── Fase: inicio ── */}
        {fase === 'inicio' && (
          <div className="prosp-modal__body">
            <p className="prosp-modal__hint">
              Sube un archivo Excel (.xlsx) con los datos de prospectos.
              Las columnas deben seguir la plantilla normalizada.
            </p>
            <button className="prosp-plantilla-btn" onClick={bajarPlantilla}>
              <i className="bi bi-file-earmark-excel" /> Descargar plantilla de importación
            </button>

            <div
              className={`prosp-dropzone ${arrastre ? 'prosp-dropzone--activo' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setArrastre(true) }}
              onDragLeave={() => setArrastre(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
            >
              <i className="bi bi-cloud-upload" />
              <span>Arrastra el archivo aquí o haz clic para seleccionar</span>
              <span className="prosp-dropzone__hint">.xlsx · .xls · .csv</span>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files[0] && procesarArchivo(e.target.files[0])}
              />
            </div>

            {error && <p className="prosp-modal__error"><i className="bi bi-exclamation-triangle" /> {error}</p>}
          </div>
        )}

        {/* ── Fase: preview ── */}
        {fase === 'preview' && (
          <div className="prosp-modal__body">
            <p className="prosp-modal__hint">
              Se reconocieron <strong>{filas.length} filas</strong>. Revisa antes de importar.
            </p>
            <div className="prosp-preview-wrap">
              <table className="prosp-preview-tabla">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nombre</th>
                    <th>Documento</th>
                    <th>Teléfono</th>
                    <th>Ciudad</th>
                    <th>Ramo</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.slice(0, 8).map((f, i) => (
                    <tr key={i} className={!f.nombre || !f.numero_documento || !f.telefono ? 'prosp-preview-fila--error' : ''}>
                      <td>{i + 2}</td>
                      <td>{f.nombre || <span className="prosp-celda-vacia">—</span>}</td>
                      <td>{f.numero_documento || <span className="prosp-celda-vacia">—</span>}</td>
                      <td>{f.telefono || <span className="prosp-celda-vacia">—</span>}</td>
                      <td>{f.ciudad || '—'}</td>
                      <td>{f.ramo_interes || '—'}</td>
                    </tr>
                  ))}
                  {filas.length > 8 && (
                    <tr>
                      <td colSpan={6} className="prosp-preview-mas">
                        … y {filas.length - 8} filas más
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {error && <p className="prosp-modal__error"><i className="bi bi-exclamation-triangle" /> {error}</p>}
            <div className="prosp-modal__footer">
              <button className="btn-secundario" onClick={() => setFase('inicio')}>
                <i className="bi bi-arrow-left" /> Volver
              </button>
              <button className="btn-primario" onClick={confirmarImportacion}>
                <i className="bi bi-check-circle" /> Importar {filas.length} prospectos
              </button>
            </div>
          </div>
        )}

        {/* ── Fase: importando ── */}
        {fase === 'importando' && (
          <div className="prosp-modal__body prosp-modal__body--centro">
            <div className="prosp-spinner" />
            <p>Importando prospectos…</p>
          </div>
        )}

        {/* ── Fase: resultado ── */}
        {fase === 'resultado' && resultado && (
          <div className="prosp-modal__body">
            <div className="prosp-resultado">
              <div className="prosp-resultado__item prosp-resultado__item--ok">
                <i className="bi bi-check-circle-fill" />
                <span><strong>{resultado.importados}</strong> importados correctamente</span>
              </div>
              {resultado.omitidos > 0 && (
                <div className="prosp-resultado__item prosp-resultado__item--warn">
                  <i className="bi bi-exclamation-triangle-fill" />
                  <span><strong>{resultado.omitidos}</strong> filas omitidas por errores</span>
                </div>
              )}
              {resultado.errores?.length > 0 && (
                <div className="prosp-resultado__errores">
                  {resultado.errores.map((e, i) => (
                    <p key={i} className="prosp-resultado__error-fila">
                      Fila {e.fila}: {e.motivo}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <div className="prosp-modal__footer">
              <button className="btn-primario" onClick={onCerrar}>
                <i className="bi bi-check" /> Listo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function Prospectos() {
  const navigate        = useNavigate()
  const { esAdmin }     = useAuth()

  // ── Estado principal ──────────────────────────────────
  const [prospectos, setProspectos]     = useState([])
  const [resumen, setResumen]           = useState([])
  const [total, setTotal]               = useState(0)
  const [pagina, setPagina]             = useState(1)
  const [paginas, setPaginas]           = useState(1)
  const [cargando, setCargando]         = useState(true)
  const [cargandoPipeline, setCargandoPipeline] = useState(true)
  const [error, setError]               = useState(null)
  const [modalImport, setModalImport]   = useState(false)

  // ── Filtros ───────────────────────────────────────────
  const [busqueda, setBusqueda]           = useState('')
  const [filtroEstado, setFiltroEstado]   = useState('')
  const [filtroCanal, setFiltroCanal]     = useState('')
  const [filtroAsesor, setFiltroAsesor]   = useState('')
  const [filtroFecha, setFiltroFecha]     = useState('')

  // Búsqueda con debounce de 350ms
  const busquedaRef = useRef()
  const [busquedaDebounced, setBusquedaDebounced] = useState('')
  useEffect(() => {
    clearTimeout(busquedaRef.current)
    busquedaRef.current = setTimeout(() => setBusquedaDebounced(busqueda), 350)
    return () => clearTimeout(busquedaRef.current)
  }, [busqueda])

  // ── Carga del pipeline (solo al montar) ───────────────
  useEffect(() => {
    obtenerResumenPipeline()
      .then(setResumen)
      .catch(() => {})
      .finally(() => setCargandoPipeline(false))
  }, [])

  // ── Carga de la tabla (reacciona a filtros y página) ──
  const cargarProspectos = useCallback(async () => {
    try {
      setCargando(true)
      setError(null)
      const filtros = {
        ...(busquedaDebounced && { busqueda: busquedaDebounced }),
        ...(filtroEstado  && { estado_id: filtroEstado }),
        ...(filtroCanal   && { canal_origen: filtroCanal }),
        ...(filtroAsesor  && { responsable_id: filtroAsesor }),
        ...(filtroFecha   && { proximo_contacto: filtroFecha }),
      }
      const res = await listarProspectos(filtros, pagina, LIMITE_PAGINA)
      setProspectos(res.items)
      setTotal(res.total)
      setPaginas(res.pages)
    } catch (e) {
      setError('No se pudieron cargar los prospectos.')
      console.error('[Prospectos]', e)
    } finally {
      setCargando(false)
    }
  }, [busquedaDebounced, filtroEstado, filtroCanal, filtroAsesor, filtroFecha, pagina])

  useEffect(() => { cargarProspectos() }, [cargarProspectos])

  // Reset página al cambiar filtros
  useEffect(() => { setPagina(1) }, [busquedaDebounced, filtroEstado, filtroCanal, filtroAsesor, filtroFecha])

  // ── Acciones de fila ──────────────────────────────────
  async function handleAvanzarContacto(e, id) {
    e.stopPropagation()
    try {
      await avanzarContacto(id)
      await cargarProspectos()
      // Refresca el pipeline también
      obtenerResumenPipeline().then(setResumen).catch(() => {})
    } catch (err) {
      console.error('[avanzarContacto]', err)
    }
  }

  function handleConvertir(e, prospecto) {
    e.stopPropagation()
    // Navega a PolizaForm con el query param para prellenar datos del prospecto
    navigate(`/produccion/nueva?desde_prospecto=${prospecto.id}`)
  }

  function handleVerPoliza(e, polizaId) {
    e.stopPropagation()
    navigate(`/produccion/${polizaId}`)
  }

  // ── Filtro rápido por card del pipeline ──────────────
  function filtrarPorEstado(estadoId) {
    const val = String(estadoId)
    setFiltroEstado(prev => prev === val ? '' : val)
  }

  // ── Render fila ───────────────────────────────────────
  function renderFila(p) {
    const clasesFecha = clasificarFecha(p.proximo_contacto)
    const esConvertido = p.estado_color === 'convertido'
    const esDescartado = p.estado_color === 'descartado'

    return (
      <tr
        key={p.id}
        className="prosp-fila"
        onClick={() => navigate(`/prospectos/${p.id}`)}
        title="Ver detalle"
      >
        <td>
          <div className="prosp-nombre">
            <span className="prosp-nombre__texto">{p.nombre}</span>
            <span className="prosp-nombre__doc">{p.numero_documento}</span>
          </div>
        </td>
        <td className="prosp-tel">{p.telefono}</td>
        <td><BadgeCanal canal={p.canal_origen} /></td>
        {esAdmin && <td className="prosp-asesor">{p.responsable_nombre}</td>}
        <td><BadgeEstado color={p.estado_color} nombre={p.estado_nombre} /></td>
        <td>
          {p.proximo_contacto ? (
            <span className={`prosp-fecha prosp-fecha--${clasesFecha}`}>
              {clasesFecha === 'vencida' && <i className="bi bi-exclamation-circle" />}
              {clasesFecha === 'hoy'     && <i className="bi bi-clock" />}
              {clasesFecha === 'futura'  && <i className="bi bi-calendar" />}
              {clasesFecha === 'hoy' ? 'Hoy' : formatFecha(p.proximo_contacto)}
            </span>
          ) : (
            <span className="prosp-fecha prosp-fecha--nula">—</span>
          )}
        </td>
        <td onClick={(e) => e.stopPropagation()}>
          <div className="prosp-acciones">
            {/* Ver detalle */}
            <button
              className="prosp-btn-icon"
              title="Ver detalle"
              onClick={() => navigate(`/prospectos/${p.id}`)}
            >
              <i className="bi bi-eye" />
            </button>

            {/* Editar — no disponible en convertidos */}
            {!esConvertido && (
              <button
                className="prosp-btn-icon"
                title="Editar"
                onClick={(e) => { e.stopPropagation(); navigate(`/prospectos/${p.id}/editar`) }}
              >
                <i className="bi bi-pencil" />
              </button>
            )}

            {/* Marcar contacto — solo si no es convertido ni descartado */}
            {!esConvertido && !esDescartado && (
              <button
                className="prosp-btn-icon prosp-btn-icon--contacto"
                title="Marcar contacto realizado"
                onClick={(e) => handleAvanzarContacto(e, p.id)}
              >
                <i className="bi bi-telephone-forward" />
              </button>
            )}

            {/* Convertir a póliza */}
            {!esConvertido && !esDescartado && (
              <button
                className="prosp-btn-convertir"
                title="Convertir a póliza"
                onClick={(e) => handleConvertir(e, p)}
              >
                → Póliza
              </button>
            )}

            {/* Si ya fue convertido: ir a la póliza */}
            {esConvertido && p.poliza_id && (
              <button
                className="prosp-btn-poliza"
                title="Ver póliza creada"
                onClick={(e) => handleVerPoliza(e, p.poliza_id)}
              >
                <i className="bi bi-file-earmark-check" /> Ver póliza
              </button>
            )}
          </div>
        </td>
      </tr>
    )
  }

  // ── Render ────────────────────────────────────────────
  return (
    <div className="prospectos page-enter">

      {/* ── Encabezado ── */}
      <div className="prosp-header">
        <h2 className="prosp-header__titulo">Prospectos</h2>
        <div className="prosp-header__acciones">
          <button
            className="btn-secundario btn-sm"
            onClick={() => setModalImport(true)}
            title="Importar desde Excel o CSV"
          >
            <i className="bi bi-upload" /> Importar
          </button>
          <button
            className="btn-primario btn-sm"
            onClick={() => navigate('/prospectos/nuevo')}
          >
            <i className="bi bi-plus-lg" /> Nuevo prospecto
          </button>
        </div>
      </div>

      {/* ── Pipeline strip ── */}
      <div className="prosp-pipeline">
        {cargandoPipeline
          ? Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="prosp-pipeline__card prosp-pipeline__card--skeleton" />
            ))
          : resumen
              .filter(e => e.cantidad > 0 || !['convertido','descartado'].includes(e.estado_color))
              .slice(0, 9)
              .map((e) => (
                <button
                  key={e.estado_id}
                  className={`prosp-pipeline__card ${filtroEstado === String(e.estado_id) ? 'prosp-pipeline__card--activo' : ''}`}
                  onClick={() => filtrarPorEstado(e.estado_id)}
                  title={`Filtrar por: ${e.estado_nombre}`}
                >
                  <span
                    className="prosp-pipeline__dot"
                    style={{ background: COLOR_PIPELINE[e.estado_color] ?? '#888' }}
                  />
                  <span className="prosp-pipeline__num">{e.cantidad}</span>
                  <span className="prosp-pipeline__label">{e.estado_nombre}</span>
                </button>
              ))
        }
      </div>

      {/* ── Filtros ── */}
      <div className="prosp-filtros">
        <div className="prosp-filtros__busqueda">
          <i className="bi bi-search" />
          <input
            type="text"
            placeholder="Buscar por nombre o documento…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button className="prosp-filtros__limpiar" onClick={() => setBusqueda('')} aria-label="Limpiar">
              <i className="bi bi-x" />
            </button>
          )}
        </div>

        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS_PIPELINE.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>

        <select value={filtroCanal} onChange={(e) => setFiltroCanal(e.target.value)}>
          <option value="">Todos los canales</option>
          {CANALES_ORIGEN.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        {esAdmin && (
          <select value={filtroAsesor} onChange={(e) => setFiltroAsesor(e.target.value)}>
            <option value="">Todos los asesores</option>
            {/* Sammy: poblar desde GET /api/v1/usuarios?rol=ASESOR */}
            <option value="2">Gina López</option>
            <option value="3">Diego Martínez</option>
            <option value="4">Dilma Suárez</option>
            <option value="5">Julieta Mora</option>
            <option value="6">Lina Castro</option>
          </select>
        )}

        <select value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)}>
          <option value="">Próximo contacto</option>
          <option value="vencido">Vencidos</option>
          <option value="hoy">Hoy</option>
          <option value="semana">Esta semana</option>
        </select>

        {(filtroEstado || filtroCanal || filtroAsesor || filtroFecha) && (
          <button
            className="prosp-filtros__reset"
            onClick={() => {
              setFiltroEstado('')
              setFiltroCanal('')
              setFiltroAsesor('')
              setFiltroFecha('')
            }}
          >
            <i className="bi bi-funnel" /> Limpiar filtros
          </button>
        )}
      </div>

      {/* ── Tabla ── */}
      {error ? (
        <div className="prosp-error">
          <i className="bi bi-wifi-off" />
          <p>{error}</p>
          <button className="btn-primario btn-sm" onClick={cargarProspectos}>
            <i className="bi bi-arrow-clockwise" /> Reintentar
          </button>
        </div>
      ) : (
        <div className="prosp-tabla-wrap">
          <table className="prosp-tabla">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Prospecto</th>
                <th style={{ width: '13%' }}>Teléfono</th>
                <th style={{ width: '10%' }}>Canal</th>
                {esAdmin && <th style={{ width: '13%' }}>Asesor</th>}
                <th style={{ width: esAdmin ? '15%' : '18%' }}>Estado</th>
                <th style={{ width: '12%' }}>Próximo contacto</th>
                <th style={{ width: esAdmin ? '15%' : '25%' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando
                ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)
                : prospectos.length === 0
                  ? (
                    <tr>
                      <td colSpan={esAdmin ? 7 : 6} className="prosp-vacio">
                        <i className="bi bi-person-x" />
                        <span>No hay prospectos con estos filtros</span>
                      </td>
                    </tr>
                  )
                  : prospectos.map(renderFila)
              }
            </tbody>
          </table>

          {/* ── Paginación ── */}
          {!cargando && paginas > 1 && (
            <div className="prosp-paginacion">
              <span className="prosp-paginacion__info">
                {total} prospecto{total !== 1 ? 's' : ''} · página {pagina} de {paginas}
              </span>
              <div className="prosp-paginacion__controles">
                <button
                  className="btn-secundario btn-sm"
                  disabled={pagina === 1}
                  onClick={() => setPagina((p) => p - 1)}
                >
                  <i className="bi bi-chevron-left" />
                </button>
                <button
                  className="btn-secundario btn-sm"
                  disabled={pagina === paginas}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  <i className="bi bi-chevron-right" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modal importación ── */}
      {modalImport && (
        <ModalImportacion
          onCerrar={() => setModalImport(false)}
          onImportado={() => {
            setModalImport(false)
            cargarProspectos()
            obtenerResumenPipeline().then(setResumen).catch(() => {})
          }}
        />
      )}
    </div>
  )
}