// ============================================================
// pages/produccion/Produccion.jsx  v3
// Migrado a api/polizas.js — cero imports de mocks
// Filtros: estado, aseguradora, ramo, asesor, mes, búsqueda
// Importar Excel (solo ADMIN) + Exportar (respeta filtros)
// Skeletons de carga, manejo de error, paginación 15 items
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  listarPolizas,
  obtenerMesesDisponibles,
  obtenerRamosUsados,
} from '../../api/polizas.js'
import {
  obtenerEstadosPoliza,
  obtenerAseguradoras,
  obtenerAsesores,
} from '../../api/catalogos.js'
import { exportarAExcel } from '../../api/importExport.js'
import ImportarPolizas from './ImportarPolizas.jsx'
import './Produccion.css'

const PAGE_SIZE = 15

// ── Helpers ───────────────────────────────────────────────
function formatPrima(valor) {
  if (!valor) return <span className="prod-tabla__vacio">—</span>
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(valor)
}

function formatFecha(fecha) {
  if (!fecha) return <span className="prod-tabla__vacio">—</span>
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function diasTranscurridos(fechaSolicitud, fechaExpedicion) {
  if (fechaExpedicion) return null
  return Math.floor(
    (new Date() - new Date(fechaSolicitud + 'T00:00:00')) / (1000 * 60 * 60 * 24)
  )
}

function formatMesLabel(claveYYYYMM) {
  const [anio, mes] = claveYYYYMM.split('-')
  const nombres = ['Ene','Feb','Mar','Abr','May','Jun',
                   'Jul','Ago','Sep','Oct','Nov','Dic']
  return `${nombres[parseInt(mes) - 1]} ${anio}`
}

// ── Skeleton de fila ──────────────────────────────────────
function FilaSkeleton() {
  return (
    <tr className="prod-tabla__fila-skeleton">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i}><div className="prod-skeleton-cell" /></td>
      ))}
    </tr>
  )
}

// ── Componente principal ──────────────────────────────────
export default function Produccion() {
  const { usuario, esAdmin } = useAuth()
  const navigate = useNavigate()

  // Datos
  const [polizas, setPolizas]   = useState([])
  const [total, setTotal]       = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState(null)

  // Modal importar
  const [mostrarImportar, setMostrarImportar] = useState(false)

  // Catálogos para filtros
  const [catEstados, setCatEstados]           = useState([])
  const [catAseguradoras, setCatAseguradoras] = useState([])
  const [catAsesores, setCatAsesores]         = useState([])
  const [catRamos, setCatRamos]               = useState([])
  const [catMeses, setCatMeses]               = useState([])

  // Filtros
  const [busqueda, setBusqueda]                   = useState('')
  const [filtroEstado, setFiltroEstado]           = useState('')
  const [filtroAseguradora, setFiltroAseguradora] = useState('')
  const [filtroRamo, setFiltroRamo]               = useState('')
  const [filtroResponsable, setFiltroResponsable] = useState('')
  const [filtroMes, setFiltroMes]                 = useState('')
  const [pagina, setPagina]                       = useState(1)

  // ── Cargar catálogos una sola vez al montar ───────────
  useEffect(() => {
    Promise.all([
      obtenerEstadosPoliza(),
      obtenerAseguradoras(),
      obtenerAsesores(),
      obtenerRamosUsados(),
      obtenerMesesDisponibles(),
    ]).then(([estados, aseguradoras, asesores, ramos, meses]) => {
      setCatEstados(estados)
      setCatAseguradoras(aseguradoras)
      setCatAsesores(asesores)
      setCatRamos(ramos)
      setCatMeses(meses)
    }).catch(console.error)
  }, [])

  // ── Cargar pólizas reactivo a filtros ─────────────────
  const cargarPolizas = useCallback(async () => {
    try {
      setCargando(true)
      setError(null)

      const params = {
        ...(filtroEstado      && { estado:         filtroEstado }),
        ...(filtroAseguradora && { aseguradora:    filtroAseguradora }),
        ...(filtroRamo        && { ramo:           filtroRamo }),
        ...(filtroMes         && { mes:            filtroMes }),
        ...(busqueda.trim()   && { search:         busqueda.trim() }),
        // Asesor solo ve sus pólizas (REQ-20)
        ...(!esAdmin          && { responsable_id: usuario.id }),
        ...(esAdmin && filtroResponsable && { responsable_id: filtroResponsable }),
      }

      const resultado = await listarPolizas(params)
      setPolizas(resultado.data)
      setTotal(resultado.total)
    } catch (err) {
      setError('No se pudieron cargar las pólizas.')
      console.error('[Produccion]', err)
    } finally {
      setCargando(false)
    }
  }, [filtroEstado, filtroAseguradora, filtroRamo, filtroMes,
      filtroResponsable, busqueda, esAdmin, usuario?.id])

  useEffect(() => {
    setPagina(1)
    cargarPolizas()
  }, [cargarPolizas])

  // ── Helpers de filtros ────────────────────────────────
  const cambiarFiltro = (setter) => (e) => {
    setter(e.target.value)
    setPagina(1)
  }

  const limpiarFiltros = () => {
    setBusqueda('')
    setFiltroEstado('')
    setFiltroAseguradora('')
    setFiltroRamo('')
    setFiltroResponsable('')
    setFiltroMes('')
    setPagina(1)
  }

  const hayFiltros = busqueda || filtroEstado || filtroAseguradora ||
                     filtroRamo || filtroResponsable || filtroMes

  // ── Paginación ────────────────────────────────────────
  const totalPaginas  = Math.max(1, Math.ceil(polizas.length / PAGE_SIZE))
  const paginaSegura  = Math.min(pagina, totalPaginas)
  const polizasPagina = polizas.slice(
    (paginaSegura - 1) * PAGE_SIZE,
    paginaSegura * PAGE_SIZE
  )

  return (
    <div className="produccion">

      {/* ── Cabecera ─────────────────────────────────── */}
      <div className="produccion__header">
        <p className="produccion__total">
          {cargando
            ? 'Cargando...'
            : `${total} póliza${total !== 1 ? 's' : ''}${hayFiltros ? ' · filtradas' : ''}`
          }
        </p>

        <div className="produccion__header-acciones">
          {/* Exportar — respeta filtros activos */}
          <button
            className="btn-secundario"
            onClick={() => exportarAExcel(polizas)}
            disabled={cargando || polizas.length === 0}
            title="Exportar pólizas filtradas a Excel"
          >
            <i className="bi bi-file-earmark-arrow-down" />
            <span>Exportar</span>
          </button>

          {/* Importar — solo ADMIN */}
          {esAdmin && (
            <button
              className="btn-secundario"
              onClick={() => setMostrarImportar(true)}
              title="Importar pólizas desde Excel"
            >
              <i className="bi bi-file-earmark-arrow-up" />
              <span>Importar</span>
            </button>
          )}

          <button
            className="btn-primario"
            onClick={() => navigate('/produccion/nueva')}
          >
            <i className="bi bi-plus-lg" />
            <span>Nueva póliza</span>
          </button>
        </div>
      </div>

      {/* ── Filtros ───────────────────────────────────── */}
      <div className="produccion__filtros">

        <div className="produccion__busqueda">
          <i className="bi bi-search produccion__busqueda-icono" />
          <input
            type="text"
            placeholder="Buscar por nombre, cédula o N° póliza..."
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPagina(1) }}
            className="produccion__input-busqueda"
          />
          {busqueda && (
            <button
              className="produccion__busqueda-limpiar"
              onClick={() => { setBusqueda(''); setPagina(1) }}
            >
              <i className="bi bi-x" />
            </button>
          )}
        </div>

        <div className="produccion__selectores">

          <select
            value={filtroEstado}
            onChange={cambiarFiltro(setFiltroEstado)}
            className="produccion__select"
          >
            <option value="">Todos los estados</option>
            {catEstados.map((e) => (
              <option key={e.id} value={e.nombre}>{e.nombre}</option>
            ))}
          </select>

          <select
            value={filtroAseguradora}
            onChange={cambiarFiltro(setFiltroAseguradora)}
            className="produccion__select"
          >
            <option value="">Todas las aseguradoras</option>
            {catAseguradoras.map((a) => (
              <option key={a.id} value={a.nombre}>{a.nombre}</option>
            ))}
          </select>

          <select
            value={filtroRamo}
            onChange={cambiarFiltro(setFiltroRamo)}
            className="produccion__select"
          >
            <option value="">Todos los ramos</option>
            {catRamos.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select
            value={filtroMes}
            onChange={cambiarFiltro(setFiltroMes)}
            className="produccion__select"
          >
            <option value="">Todos los meses</option>
            {catMeses.map((m) => (
              <option key={m} value={m}>{formatMesLabel(m)}</option>
            ))}
          </select>

          {esAdmin && (
            <select
              value={filtroResponsable}
              onChange={cambiarFiltro(setFiltroResponsable)}
              className="produccion__select"
            >
              <option value="">Todos los asesores</option>
              {catAsesores.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          )}

          {hayFiltros && (
            <button className="produccion__btn-limpiar" onClick={limpiarFiltros}>
              <i className="bi bi-x-circle" />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────── */}
      {error && (
        <div className="prod-error">
          <i className="bi bi-wifi-off" />
          <span>{error}</span>
          <button className="btn-secundario" onClick={cargarPolizas}>
            <i className="bi bi-arrow-clockwise" /> Reintentar
          </button>
        </div>
      )}

      {/* ── Tabla ─────────────────────────────────────── */}
      {!error && (
        <div className="prod-tabla__wrap">
          {!cargando && polizas.length === 0 ? (
            <div className="prod-tabla__vacio-estado">
              <i className="bi bi-inbox" />
              <p>No se encontraron pólizas con los filtros aplicados.</p>
              {hayFiltros && (
                <button className="btn-secundario" onClick={limpiarFiltros}>
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <>
              <table className="prod-tabla">
                <thead>
                  <tr>
                    <th>Estado</th>
                    <th>Cliente</th>
                    <th>Producto / Ramo</th>
                    <th>Aseguradora</th>
                    <th>N° Póliza</th>
                    <th>Prima</th>
                    <th>F. Solicitud</th>
                    <th>F. Expedición</th>
                    {esAdmin && <th>Asesor</th>}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cargando
                    ? Array.from({ length: 6 }).map((_, i) => <FilaSkeleton key={i} />)
                    : polizasPagina.map((poliza) => (
                        <FilaPoliza
                          key={poliza.id}
                          poliza={poliza}
                          esAdmin={esAdmin}
                          onVer={() => navigate(`/produccion/${poliza.id}`)}
                          onEditar={() => navigate(`/produccion/${poliza.id}/editar`)}
                        />
                      ))
                  }
                </tbody>
              </table>

              {/* ── Paginación ──────────────────────── */}
              {!cargando && totalPaginas > 1 && (
                <div className="prod-paginacion">
                  <span className="prod-paginacion__info">
                    {(paginaSegura - 1) * PAGE_SIZE + 1}–{Math.min(paginaSegura * PAGE_SIZE, polizas.length)} de {polizas.length}
                  </span>
                  <div className="prod-paginacion__controles">
                    <button
                      className="prod-paginacion__btn"
                      onClick={() => setPagina(1)}
                      disabled={paginaSegura === 1}
                      title="Primera"
                    >
                      <i className="bi bi-chevron-double-left" />
                    </button>
                    <button
                      className="prod-paginacion__btn"
                      onClick={() => setPagina((p) => Math.max(1, p - 1))}
                      disabled={paginaSegura === 1}
                      title="Anterior"
                    >
                      <i className="bi bi-chevron-left" />
                    </button>

                    {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                      .filter((n) => {
                        if (totalPaginas <= 5) return true
                        if (n === 1 || n === totalPaginas) return true
                        return Math.abs(n - paginaSegura) <= 1
                      })
                      .reduce((acc, n, idx, arr) => {
                        if (idx > 0 && n - arr[idx - 1] > 1) acc.push('...')
                        acc.push(n)
                        return acc
                      }, [])
                      .map((item, idx) =>
                        item === '...' ? (
                          <span key={`d${idx}`} className="prod-paginacion__dots">…</span>
                        ) : (
                          <button
                            key={item}
                            className={`prod-paginacion__btn ${item === paginaSegura ? 'prod-paginacion__btn--activo' : ''}`}
                            onClick={() => setPagina(item)}
                          >
                            {item}
                          </button>
                        )
                      )
                    }

                    <button
                      className="prod-paginacion__btn"
                      onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                      disabled={paginaSegura === totalPaginas}
                      title="Siguiente"
                    >
                      <i className="bi bi-chevron-right" />
                    </button>
                    <button
                      className="prod-paginacion__btn"
                      onClick={() => setPagina(totalPaginas)}
                      disabled={paginaSegura === totalPaginas}
                      title="Última"
                    >
                      <i className="bi bi-chevron-double-right" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Modal importar ────────────────────────────── */}
      {mostrarImportar && (
        <ImportarPolizas
          onCerrar={() => setMostrarImportar(false)}
          onImportado={() => {
            cargarPolizas()       // recarga tabla tras importar
            setCatMeses([])       // fuerza refrescar meses disponibles
            obtenerMesesDisponibles().then(setCatMeses)
          }}
        />
      )}

    </div>
  )
}

// ── Fila de póliza ────────────────────────────────────────
function FilaPoliza({ poliza, esAdmin, onVer, onEditar }) {
  const dias         = diasTranscurridos(poliza.fecha_solicitud, poliza.fecha_expedicion)
  const diasCritico  = dias !== null && dias > 15
  const diasAtencion = dias !== null && dias > 7 && dias <= 15

  return (
    <tr
      className={`prod-tabla__fila ${!poliza.fecha_expedicion ? 'prod-tabla__fila--pendiente' : ''}`}
      onClick={onVer}
    >
      <td>
        <span className={`prod-badge prod-badge--${poliza.estado_color}`}>
          {poliza.estado}
        </span>
      </td>
      <td>
        <div className="prod-tabla__cliente">
          <span className="prod-tabla__cliente-nombre">{poliza.cliente_nombre}</span>
          <span className="prod-tabla__cliente-doc">{poliza.cliente_documento}</span>
        </div>
      </td>
      <td>
        <div className="prod-tabla__producto">
          <span>{poliza.producto}</span>
          <span className="prod-tabla__ramo">{poliza.ramo}</span>
        </div>
      </td>
      <td>
        <span className="prod-tabla__aseguradora">{poliza.aseguradora}</span>
      </td>
      <td>
        {poliza.numero_poliza
          ? <span className="prod-tabla__numero">{poliza.numero_poliza}</span>
          : <span className="prod-tabla__vacio">Pendiente</span>
        }
      </td>
      <td className="prod-tabla__prima">{formatPrima(poliza.prima)}</td>
      <td>{formatFecha(poliza.fecha_solicitud)}</td>
      <td>
        <div className="prod-tabla__fecha-exp">
          {formatFecha(poliza.fecha_expedicion)}
          {dias !== null && (
            <span className={`prod-tabla__dias ${
              diasCritico  ? 'prod-tabla__dias--critico'  :
              diasAtencion ? 'prod-tabla__dias--atencion' : ''
            }`}>
              {dias}d
            </span>
          )}
        </div>
      </td>
      {esAdmin && (
        <td>
          <span className="prod-tabla__asesor">{poliza.responsable_nombre}</span>
        </td>
      )}
      <td onClick={(e) => e.stopPropagation()}>
        <div className="prod-tabla__acciones">
          <button
            className="prod-tabla__btn-accion"
            onClick={onVer}
            title="Ver detalle"
          >
            <i className="bi bi-eye" />
          </button>
          <button
            className="prod-tabla__btn-accion"
            onClick={onEditar}
            title="Editar"
          >
            <i className="bi bi-pencil" />
          </button>
        </div>
      </td>
    </tr>
  )
}