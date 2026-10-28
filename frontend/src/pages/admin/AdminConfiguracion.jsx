// ============================================================
// src/pages/admin/AdminCatalogos.jsx
// Panel de catálogos del sistema, en pestañas:
//   - Catálogo genérico (catalogo_tipo / catalogo_valor): maestro-
//     detalle, sin borrado duro (DT-017).
//   - Catálogos legacy con endpoints propios: estados de póliza,
//     aseguradoras, productos, ramos, tipos de documento (CRUD
//     completo con DELETE) y estados de prospecto (sin DELETE,
//     mismo criterio que el genérico — ver DT-017/DT-019).
// Datos: api/catalogos.js
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import {
  listarTiposCatalogo,
  crearTipoCatalogo,
  listarValoresCatalogo,
  crearValorCatalogo,
  actualizarValorCatalogo,
  obtenerEstadosPoliza,
  crearEstadoPoliza,
  actualizarEstadoPoliza,
  eliminarEstadoPoliza,
  obtenerAseguradoras,
  crearAseguradora,
  actualizarAseguradora,
  eliminarAseguradora,
  obtenerProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  obtenerRamos,
  crearRamo,
  actualizarRamo,
  eliminarRamo,
  obtenerTiposDocumento,
  crearTipoDocumento,
  actualizarTipoDocumento,
  eliminarTipoDocumento,
  listarEstadosProspectoAdmin,
  crearEstadoProspecto,
  actualizarEstadoProspecto,
} from '../../api/catalogos.js'
import Toast from '../../components/Toast.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import './AdminCatalogos.css'

// ── Pestañas ───────────────────────────────────────────────
const TABS = [
  { id: 'generico', label: 'Catálogo genérico', icono: 'bi-sliders' },
  { id: 'estados_poliza', label: 'Estados de póliza', icono: 'bi-file-earmark-check' },
  { id: 'aseguradoras', label: 'Aseguradoras', icono: 'bi-shield-check' },
  { id: 'productos', label: 'Productos', icono: 'bi-box-seam' },
  { id: 'ramos', label: 'Ramos', icono: 'bi-diagram-3' },
  { id: 'tipos_documento', label: 'Tipos de documento', icono: 'bi-card-text' },
  { id: 'estados_prospecto', label: 'Estados de prospecto', icono: 'bi-person-lines-fill' },
]

// Config de cada catálogo legacy: campos propios + funciones de api/catalogos.js.
// `eliminar` ausente ⇒ la tabla muestra switch activo/inactivo en su lugar
// (solo aplica a estados_prospecto, que ya trae esa columna del backend).
const CONFIG_LEGADO = {
  estados_poliza: {
    campos: [
      { key: 'nombre', label: 'Nombre', tipo: 'text' },
      { key: 'color', label: 'Color', tipo: 'color' },
    ],
    listar: obtenerEstadosPoliza,
    crear: crearEstadoPoliza,
    actualizar: actualizarEstadoPoliza,
    eliminar: eliminarEstadoPoliza,
  },
  aseguradoras: {
    campos: [{ key: 'nombre', label: 'Nombre', tipo: 'text' }],
    listar: obtenerAseguradoras,
    crear: crearAseguradora,
    actualizar: actualizarAseguradora,
    eliminar: eliminarAseguradora,
  },
  productos: {
    campos: [{ key: 'nombre', label: 'Nombre', tipo: 'text' }],
    listar: obtenerProductos,
    crear: crearProducto,
    actualizar: actualizarProducto,
    eliminar: eliminarProducto,
  },
  ramos: {
    campos: [
      { key: 'codigo', label: 'Código', tipo: 'text' },
      { key: 'nombre', label: 'Nombre', tipo: 'text' },
    ],
    listar: obtenerRamos,
    crear: crearRamo,
    actualizar: actualizarRamo,
    eliminar: eliminarRamo,
  },
  tipos_documento: {
    campos: [{ key: 'nombre', label: 'Nombre', tipo: 'text' }],
    listar: obtenerTiposDocumento,
    crear: crearTipoDocumento,
    actualizar: actualizarTipoDocumento,
    eliminar: eliminarTipoDocumento,
  },
  estados_prospecto: {
    campos: [
      { key: 'nombre', label: 'Nombre', tipo: 'text' },
      { key: 'color', label: 'Color', tipo: 'color' },
      { key: 'orden', label: 'Orden', tipo: 'number' },
    ],
    listar: listarEstadosProspectoAdmin,
    crear: crearEstadoProspecto,
    actualizar: actualizarEstadoProspecto,
    // sin eliminar: usa switch activo/inactivo, igual que el genérico (DT-017)
  },
}

// ============================================================
// COMPONENTE PRINCIPAL — switch de pestañas
// ============================================================
export default function AdminCatalogos() {
  const [tabActiva, setTabActiva] = useState('generico')

  return (
    <div className="catlg page-enter">
      <div className="catlg-header">
        <h2 className="catlg-header__titulo">Catálogos</h2>
        <p className="catlg-header__sub">
          Valores configurables del sistema (estados, tipos de pregunta, aseguradoras, etc.) sin necesidad de desplegar código nuevo.
        </p>
      </div>

      <div className="catlg-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`catlg-tabs__item ${tabActiva === t.id ? 'catlg-tabs__item--activo' : ''}`}
            onClick={() => setTabActiva(t.id)}
          >
            <i className={`bi ${t.icono}`} /> {t.label}
          </button>
        ))}
      </div>

      {tabActiva === 'generico' ? (
        <CatalogoGenerico />
      ) : (
        <CatalogoLegado key={tabActiva} config={CONFIG_LEGADO[tabActiva]} titulo={TABS.find((t) => t.id === tabActiva).label} />
      )}
    </div>
  )
}

// ============================================================
// CATÁLOGO GENÉRICO (catalogo_tipo / catalogo_valor)
// Maestro-detalle: tipos a la izquierda, valores a la derecha.
// ============================================================
const TIPO_VACIO = { codigo: '', nombre: '', descripcion: '' }
const VALOR_VACIO = { codigo: '', nombre: '', descripcion: '', orden: '' }

function CatalogoGenerico() {
  // ── Tipos (columna izquierda) ──────────────────────────
  const [tipos, setTipos]               = useState([])
  const [cargandoTipos, setCargandoTipos] = useState(true)
  const [tipoSel, setTipoSel]           = useState(null)
  const [errorTipos, setErrorTipos]     = useState(null)

  const [formTipoAbierto, setFormTipoAbierto] = useState(false)
  const [nuevoTipo, setNuevoTipo]       = useState(TIPO_VACIO)
  const [guardandoTipo, setGuardandoTipo] = useState(false)
  const [errorNuevoTipo, setErrorNuevoTipo] = useState(null)

  // ── Valores (columna derecha) ──────────────────────────
  const [valores, setValores]           = useState([])
  const [cargandoValores, setCargandoValores] = useState(false)
  const [errorValores, setErrorValores] = useState(null)

  const [formValorAbierto, setFormValorAbierto] = useState(false)
  const [nuevoValor, setNuevoValor]     = useState(VALOR_VACIO)
  const [guardandoValor, setGuardandoValor] = useState(false)
  const [errorNuevoValor, setErrorNuevoValor] = useState(null)

  const [editandoId, setEditandoId]     = useState(null)
  const [edicion, setEdicion]           = useState({})
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)

  const [toast, setToast] = useState(null)

  // ── Carga de tipos ──────────────────────────────────────
  const cargarTipos = useCallback(async () => {
    try {
      setCargandoTipos(true)
      setErrorTipos(null)
      const data = await listarTiposCatalogo()
      setTipos(data)
      if (data.length > 0 && !tipoSel) setTipoSel(data[0].codigo)
    } catch (e) {
      setErrorTipos('No se pudieron cargar los catálogos.')
      console.error('[AdminCatalogos]', e)
    } finally {
      setCargandoTipos(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, mismo patrón que Prospectos.jsx (ver DT-018)
  useEffect(() => { cargarTipos() }, [cargarTipos])

  // ── Carga de valores del tipo seleccionado ──────────────
  const cargarValores = useCallback(async () => {
    if (!tipoSel) return
    try {
      setCargandoValores(true)
      setErrorValores(null)
      const data = await listarValoresCatalogo(tipoSel)
      setValores(data)
    } catch (e) {
      setErrorValores('No se pudieron cargar los valores de este catálogo.')
      console.error('[AdminCatalogos]', e)
    } finally {
      setCargandoValores(false)
    }
  }, [tipoSel])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, mismo patrón que Prospectos.jsx (ver DT-018)
  useEffect(() => { cargarValores() }, [cargarValores])

  // ── Crear tipo ───────────────────────────────────────────
  async function handleCrearTipo(e) {
    e.preventDefault()
    if (!nuevoTipo.codigo.trim() || !nuevoTipo.nombre.trim()) {
      setErrorNuevoTipo('Código y nombre son obligatorios.')
      return
    }
    try {
      setGuardandoTipo(true)
      setErrorNuevoTipo(null)
      const creado = await crearTipoCatalogo({
        codigo: nuevoTipo.codigo.trim(),
        nombre: nuevoTipo.nombre.trim(),
        descripcion: nuevoTipo.descripcion.trim() || null,
      })
      setTipos((prev) => [...prev, creado])
      setTipoSel(creado.codigo)
      setNuevoTipo(TIPO_VACIO)
      setFormTipoAbierto(false)
    } catch (err) {
      setErrorNuevoTipo(err.response?.data?.detail || 'No se pudo crear el catálogo.')
    } finally {
      setGuardandoTipo(false)
    }
  }

  // ── Crear valor ──────────────────────────────────────────
  async function handleCrearValor(e) {
    e.preventDefault()
    if (!nuevoValor.codigo.trim() || !nuevoValor.nombre.trim()) {
      setErrorNuevoValor('Código y nombre son obligatorios.')
      return
    }
    try {
      setGuardandoValor(true)
      setErrorNuevoValor(null)
      const creado = await crearValorCatalogo(tipoSel, {
        codigo: nuevoValor.codigo.trim(),
        nombre: nuevoValor.nombre.trim(),
        descripcion: nuevoValor.descripcion.trim() || null,
        orden: nuevoValor.orden !== '' ? parseInt(nuevoValor.orden, 10) : null,
      })
      setValores((prev) => [...prev, creado].sort((a, b) => a.orden - b.orden))
      setNuevoValor(VALOR_VACIO)
      setFormValorAbierto(false)
    } catch (err) {
      setErrorNuevoValor(err.response?.data?.detail || 'No se pudo crear el valor.')
    } finally {
      setGuardandoValor(false)
    }
  }

  // ── Editar valor (inline) ─────────────────────────────────
  function iniciarEdicion(valor) {
    setEditandoId(valor.id)
    setEdicion({
      nombre: valor.nombre,
      descripcion: valor.descripcion || '',
      orden: valor.orden,
    })
  }

  function cancelarEdicion() {
    setEditandoId(null)
    setEdicion({})
  }

  async function guardarEdicion(id) {
    try {
      setGuardandoEdicion(true)
      const actualizado = await actualizarValorCatalogo(id, {
        nombre: edicion.nombre.trim(),
        descripcion: edicion.descripcion.trim() || null,
        orden: parseInt(edicion.orden, 10),
      })
      setValores((prev) =>
        prev.map((v) => (v.id === id ? actualizado : v)).sort((a, b) => a.orden - b.orden)
      )
      cancelarEdicion()
    } catch (err) {
      setToast({ tipo: 'error', mensaje: err.response?.data?.detail || 'No se pudo guardar el cambio.' })
    } finally {
      setGuardandoEdicion(false)
    }
  }

  async function alternarActivo(valor) {
    try {
      const actualizado = await actualizarValorCatalogo(valor.id, { activo: !valor.activo })
      setValores((prev) => prev.map((v) => (v.id === valor.id ? actualizado : v)))
    } catch (err) {
      setToast({ tipo: 'error', mensaje: err.response?.data?.detail || 'No se pudo cambiar el estado.' })
    }
  }

  const tipoActual = tipos.find((t) => t.codigo === tipoSel)

  return (
    <>
    <div className="catlg-layout">

      {/* ── Columna: tipos ── */}
      <div className="catlg-tipos">
        <div className="catlg-tipos__header">
          <span>Catálogos</span>
          <button
            className="catlg-btn-icon"
            title="Nuevo catálogo"
            onClick={() => setFormTipoAbierto((v) => !v)}
          >
            <i className="bi bi-plus-lg" />
          </button>
        </div>

        {formTipoAbierto && (
          <form className="catlg-form-tipo" onSubmit={handleCrearTipo}>
            <input
              type="text"
              placeholder="código (ej. formulario_estado)"
              value={nuevoTipo.codigo}
              onChange={(e) => setNuevoTipo((p) => ({ ...p, codigo: e.target.value }))}
            />
            <input
              type="text"
              placeholder="Nombre visible"
              value={nuevoTipo.nombre}
              onChange={(e) => setNuevoTipo((p) => ({ ...p, nombre: e.target.value }))}
            />
            <input
              type="text"
              placeholder="Descripción (opcional)"
              value={nuevoTipo.descripcion}
              onChange={(e) => setNuevoTipo((p) => ({ ...p, descripcion: e.target.value }))}
            />
            {errorNuevoTipo && <p className="catlg-error-msg">{errorNuevoTipo}</p>}
            <div className="catlg-form-tipo__acciones">
              <button type="button" className="catlg-btn-secundario" onClick={() => setFormTipoAbierto(false)}>
                Cancelar
              </button>
              <button type="submit" className="catlg-btn-primario" disabled={guardandoTipo}>
                {guardandoTipo ? 'Guardando…' : 'Crear'}
              </button>
            </div>
          </form>
        )}

        {errorTipos && <p className="catlg-error-msg">{errorTipos}</p>}

        <ul className="catlg-tipos__lista">
          {cargandoTipos
            ? Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="catlg-tipos__skeleton" />
              ))
            : tipos.map((t) => (
                <li key={t.id}>
                  <button
                    className={`catlg-tipos__item ${tipoSel === t.codigo ? 'catlg-tipos__item--activo' : ''}`}
                    onClick={() => setTipoSel(t.codigo)}
                    title={t.descripcion || ''}
                  >
                    <span className="catlg-tipos__nombre">{t.nombre}</span>
                    <span className="catlg-tipos__codigo">{t.codigo}</span>
                  </button>
                </li>
              ))
          }
          {!cargandoTipos && tipos.length === 0 && (
            <li className="catlg-tipos__vacio">Sin catálogos todavía.</li>
          )}
        </ul>
      </div>

      {/* ── Columna: valores del tipo seleccionado ── */}
      <div className="catlg-valores">
        {!tipoActual ? (
          <div className="catlg-valores__vacio">
            <i className="bi bi-sliders" />
            <span>Selecciona o crea un catálogo para ver sus valores.</span>
          </div>
        ) : (
          <>
            <div className="catlg-valores__header">
              <div>
                <h3 className="catlg-valores__titulo">{tipoActual.nombre}</h3>
                {tipoActual.descripcion && (
                  <p className="catlg-valores__descripcion">{tipoActual.descripcion}</p>
                )}
              </div>
              <button
                className="catlg-btn-primario catlg-btn--sm"
                onClick={() => setFormValorAbierto((v) => !v)}
              >
                <i className="bi bi-plus-lg" /> Nuevo valor
              </button>
            </div>

            {formValorAbierto && (
              <form className="catlg-form-valor" onSubmit={handleCrearValor}>
                <input
                  type="text"
                  placeholder="código (ej. borrador)"
                  value={nuevoValor.codigo}
                  onChange={(e) => setNuevoValor((p) => ({ ...p, codigo: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Nombre visible"
                  value={nuevoValor.nombre}
                  onChange={(e) => setNuevoValor((p) => ({ ...p, nombre: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Descripción (opcional)"
                  value={nuevoValor.descripcion}
                  onChange={(e) => setNuevoValor((p) => ({ ...p, descripcion: e.target.value }))}
                />
                <input
                  type="number"
                  placeholder="Orden"
                  value={nuevoValor.orden}
                  onChange={(e) => setNuevoValor((p) => ({ ...p, orden: e.target.value }))}
                />
                {errorNuevoValor && <p className="catlg-error-msg">{errorNuevoValor}</p>}
                <div className="catlg-form-valor__acciones">
                  <button type="button" className="catlg-btn-secundario" onClick={() => setFormValorAbierto(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="catlg-btn-primario" disabled={guardandoValor}>
                    {guardandoValor ? 'Guardando…' : 'Crear'}
                  </button>
                </div>
              </form>
            )}

            {errorValores && <p className="catlg-error-msg">{errorValores}</p>}

            <div className="catlg-tabla-wrap">
              <table className="catlg-tabla">
                <thead>
                  <tr>
                    <th style={{ width: '10%' }}>Orden</th>
                    <th style={{ width: '15%' }}>Código</th>
                    <th style={{ width: '25%' }}>Nombre</th>
                    <th style={{ width: '30%' }}>Descripción</th>
                    <th style={{ width: '10%' }}>Activo</th>
                    <th style={{ width: '10%' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cargandoValores
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i}><td colSpan={6} className="catlg-skeleton-fila" /></tr>
                      ))
                    : valores.length === 0
                      ? (
                        <tr>
                          <td colSpan={6} className="catlg-tabla__vacio">
                            <i className="bi bi-inbox" /> Sin valores en este catálogo
                          </td>
                        </tr>
                      )
                      : valores.map((v) => {
                        const enEdicion = editandoId === v.id
                        return (
                          <tr key={v.id} className={!v.activo ? 'catlg-fila--inactivo' : ''}>
                            <td>
                              {enEdicion ? (
                                <input
                                  type="number"
                                  className="catlg-input-inline"
                                  value={edicion.orden}
                                  onChange={(e) => setEdicion((p) => ({ ...p, orden: e.target.value }))}
                                />
                              ) : v.orden}
                            </td>
                            <td className="catlg-codigo">{v.codigo}</td>
                            <td>
                              {enEdicion ? (
                                <input
                                  type="text"
                                  className="catlg-input-inline"
                                  value={edicion.nombre}
                                  onChange={(e) => setEdicion((p) => ({ ...p, nombre: e.target.value }))}
                                />
                              ) : v.nombre}
                            </td>
                            <td>
                              {enEdicion ? (
                                <input
                                  type="text"
                                  className="catlg-input-inline"
                                  value={edicion.descripcion}
                                  onChange={(e) => setEdicion((p) => ({ ...p, descripcion: e.target.value }))}
                                />
                              ) : (v.descripcion || <span className="catlg-celda-vacia">—</span>)}
                            </td>
                            <td>
                              <button
                                className={`catlg-switch ${v.activo ? 'catlg-switch--on' : ''}`}
                                onClick={() => alternarActivo(v)}
                                title={v.activo ? 'Desactivar' : 'Activar'}
                              >
                                <span className="catlg-switch__bola" />
                              </button>
                            </td>
                            <td>
                              {enEdicion ? (
                                <div className="catlg-acciones">
                                  <button
                                    className="catlg-btn-icon catlg-btn-icon--ok"
                                    title="Guardar"
                                    disabled={guardandoEdicion}
                                    onClick={() => guardarEdicion(v.id)}
                                  >
                                    <i className="bi bi-check-lg" />
                                  </button>
                                  <button
                                    className="catlg-btn-icon"
                                    title="Cancelar"
                                    onClick={cancelarEdicion}
                                  >
                                    <i className="bi bi-x-lg" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="catlg-btn-icon"
                                  title="Editar"
                                  onClick={() => iniciarEdicion(v)}
                                >
                                  <i className="bi bi-pencil" />
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })
                  }
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
    <Toast toast={toast} onCerrar={() => setToast(null)} />
    </>
  )
}

// ============================================================
// CATÁLOGO LEGACY — genérico para estados_poliza, aseguradoras,
// productos, ramos, tipos_documento, estados_prospecto.
// Config define los campos propios y las funciones de api que
// usa cada uno (ver CONFIG_LEGADO arriba).
// ============================================================
function valorVacioDesdeConfig(config) {
  return config.campos.reduce((acc, c) => ({ ...acc, [c.key]: '' }), {})
}

function CatalogoLegado({ config, titulo }) {
  const [valores, setValores]     = useState([])
  const [cargando, setCargando]   = useState(true)
  const [error, setError]         = useState(null)

  const [formAbierto, setFormAbierto] = useState(false)
  const [nuevo, setNuevo]         = useState(() => valorVacioDesdeConfig(config))
  const [guardando, setGuardando] = useState(false)
  const [errorNuevo, setErrorNuevo] = useState(null)

  const [editandoId, setEditandoId] = useState(null)
  const [edicion, setEdicion]       = useState({})
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)

  const [toast, setToast] = useState(null)
  const [confirmacion, setConfirmacion] = useState(null)

  const cargar = useCallback(async () => {
    try {
      setCargando(true)
      setError(null)
      const data = await config.listar()
      setValores(data)
    } catch (e) {
      setError('No se pudo cargar este catálogo.')
      console.error('[AdminCatalogos]', e)
    } finally {
      setCargando(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, mismo patrón que Prospectos.jsx (ver DT-018)
  useEffect(() => { cargar() }, [cargar])

  function normalizar(campos, valores) {
    const payload = {}
    for (const c of campos) {
      const v = valores[c.key]
      payload[c.key] = c.tipo === 'number' ? (v === '' ? null : parseInt(v, 10)) : v
    }
    return payload
  }

  async function handleCrear(e) {
    e.preventDefault()
    const faltante = config.campos.find((c) => c.tipo !== 'number' && !String(nuevo[c.key] || '').trim())
    if (faltante) {
      setErrorNuevo(`${faltante.label} es obligatorio.`)
      return
    }
    try {
      setGuardando(true)
      setErrorNuevo(null)
      const creado = await config.crear(normalizar(config.campos, nuevo))
      setValores((prev) => [...prev, creado])
      setNuevo(valorVacioDesdeConfig(config))
      setFormAbierto(false)
    } catch (err) {
      setErrorNuevo(err.response?.data?.detail || 'No se pudo crear el registro.')
    } finally {
      setGuardando(false)
    }
  }

  function iniciarEdicion(valor) {
    setEditandoId(valor.id)
    setEdicion(config.campos.reduce((acc, c) => ({ ...acc, [c.key]: valor[c.key] }), {}))
  }

  function cancelarEdicion() {
    setEditandoId(null)
    setEdicion({})
  }

  async function guardarEdicion(id) {
    try {
      setGuardandoEdicion(true)
      const actualizado = await config.actualizar(id, normalizar(config.campos, edicion))
      setValores((prev) => prev.map((v) => (v.id === id ? actualizado : v)))
      cancelarEdicion()
    } catch (err) {
      setToast({ tipo: 'error', mensaje: err.response?.data?.detail || 'No se pudo guardar el cambio.' })
    } finally {
      setGuardandoEdicion(false)
    }
  }

  function handleEliminar(id) {
    setConfirmacion({
      mensaje: '¿Eliminar este registro? Esta acción no se puede deshacer.',
      onConfirmar: async () => {
        setConfirmacion(null)
        try {
          await config.eliminar(id)
          setValores((prev) => prev.filter((v) => v.id !== id))
        } catch (err) {
          setToast({ tipo: 'error', mensaje: err.response?.data?.detail || 'No se pudo eliminar (puede estar en uso).' })
        }
      },
    })
  }

  async function alternarActivo(valor) {
    try {
      const actualizado = await config.actualizar(valor.id, { activo: !valor.activo })
      setValores((prev) => prev.map((v) => (v.id === valor.id ? actualizado : v)))
    } catch (err) {
      setToast({ tipo: 'error', mensaje: err.response?.data?.detail || 'No se pudo cambiar el estado.' })
    }
  }

  const usaActivo = !config.eliminar

  return (
    <>
    <div className="catlg-valores catlg-valores--solo">
      <div className="catlg-valores__header">
        <h3 className="catlg-valores__titulo">{titulo}</h3>
        <button className="catlg-btn-primario catlg-btn--sm" onClick={() => setFormAbierto((v) => !v)}>
          <i className="bi bi-plus-lg" /> Nuevo
        </button>
      </div>

      {formAbierto && (
        <form className="catlg-form-valor" onSubmit={handleCrear}>
          {config.campos.map((c) => (
            <input
              key={c.key}
              type={c.tipo === 'color' ? 'text' : c.tipo}
              placeholder={c.tipo === 'color' ? `${c.label} (ej. #3B6CB7)` : c.label}
              value={nuevo[c.key]}
              onChange={(e) => setNuevo((p) => ({ ...p, [c.key]: e.target.value }))}
            />
          ))}
          {errorNuevo && <p className="catlg-error-msg">{errorNuevo}</p>}
          <div className="catlg-form-valor__acciones">
            <button type="button" className="catlg-btn-secundario" onClick={() => setFormAbierto(false)}>
              Cancelar
            </button>
            <button type="submit" className="catlg-btn-primario" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Crear'}
            </button>
          </div>
        </form>
      )}

      {error && <p className="catlg-error-msg">{error}</p>}

      <div className="catlg-tabla-wrap">
        <table className="catlg-tabla">
          <thead>
            <tr>
              {config.campos.map((c) => <th key={c.key}>{c.label}</th>)}
              <th style={{ width: '10%' }}>{usaActivo ? 'Activo' : ''}</th>
              <th style={{ width: '10%' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={config.campos.length + 2} className="catlg-skeleton-fila" /></tr>
                ))
              : valores.length === 0
                ? (
                  <tr>
                    <td colSpan={config.campos.length + 2} className="catlg-tabla__vacio">
                      <i className="bi bi-inbox" /> Sin registros todavía
                    </td>
                  </tr>
                )
                : valores.map((v) => {
                  const enEdicion = editandoId === v.id
                  return (
                    <tr key={v.id} className={usaActivo && !v.activo ? 'catlg-fila--inactivo' : ''}>
                      {config.campos.map((c) => (
                        <td key={c.key}>
                          {enEdicion ? (
                            <input
                              type={c.tipo === 'color' ? 'text' : c.tipo}
                              className="catlg-input-inline"
                              value={edicion[c.key]}
                              onChange={(e) => setEdicion((p) => ({ ...p, [c.key]: e.target.value }))}
                            />
                          ) : c.tipo === 'color' ? (
                            <span className="catlg-color">
                              <span className="catlg-color__muestra" style={{ backgroundColor: v[c.key] }} />
                              {v[c.key]}
                            </span>
                          ) : v[c.key]}
                        </td>
                      ))}
                      <td>
                        {usaActivo && (
                          <button
                            className={`catlg-switch ${v.activo ? 'catlg-switch--on' : ''}`}
                            onClick={() => alternarActivo(v)}
                            title={v.activo ? 'Desactivar' : 'Activar'}
                          >
                            <span className="catlg-switch__bola" />
                          </button>
                        )}
                      </td>
                      <td>
                        {enEdicion ? (
                          <div className="catlg-acciones">
                            <button
                              className="catlg-btn-icon catlg-btn-icon--ok"
                              title="Guardar"
                              disabled={guardandoEdicion}
                              onClick={() => guardarEdicion(v.id)}
                            >
                              <i className="bi bi-check-lg" />
                            </button>
                            <button className="catlg-btn-icon" title="Cancelar" onClick={cancelarEdicion}>
                              <i className="bi bi-x-lg" />
                            </button>
                          </div>
                        ) : (
                          <div className="catlg-acciones">
                            <button className="catlg-btn-icon" title="Editar" onClick={() => iniciarEdicion(v)}>
                              <i className="bi bi-pencil" />
                            </button>
                            {config.eliminar && (
                              <button
                                className="catlg-btn-icon catlg-btn-icon--danger"
                                title="Eliminar"
                                onClick={() => handleEliminar(v.id)}
                              >
                                <i className="bi bi-trash" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
            }
          </tbody>
        </table>
      </div>
    </div>
    <Toast toast={toast} onCerrar={() => setToast(null)} />
    <ConfirmDialog confirmacion={confirmacion} onCancelar={() => setConfirmacion(null)} />
    </>
  )
}
