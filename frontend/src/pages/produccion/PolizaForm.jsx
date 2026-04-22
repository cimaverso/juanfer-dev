// ============================================================
// pages/produccion/PolizaForm.jsx  v2
// Migrado a api/catalogos.js — cero imports de mocks
// Catálogos dinámicos cargados con obtenerTodosCatalogos()
// REQ-01: campos obligatorios y diferidos
// REQ-02: número y prima opcionales al crear
// REQ-04: dos fechas independientes
// REQ-05: cliente separado de póliza
// ============================================================

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { obtenerPoliza, crearPoliza, editarPoliza, buscarClientePorDocumento } from '../../api/polizas.js'
import { obtenerTodosCatalogos } from '../../api/catalogos.js'
import './PolizaForm.css'

// ── Estado inicial ────────────────────────────────────────
const FORM_INICIAL = {
  tipo_documento:   '',
  numero_documento: '',
  nombre_completo:  '',
  celular:          '',
  asegurado_nombre: '',
  ramo_id:          '',
  aseguradora_id:   '',
  producto_id:      '',
  estado_id:        '',
  responsable_id:   '',
  fecha_solicitud:  new Date().toISOString().split('T')[0],
  fecha_expedicion: '',
  numero_poliza:    '',
  prima:            '',
  observacion:      '',
}

// ── Validación ────────────────────────────────────────────
function validar(form) {
  const errores = {}
  if (!form.tipo_documento)   errores.tipo_documento   = 'Requerido'
  if (!form.numero_documento) errores.numero_documento = 'Requerido'
  if (!form.nombre_completo)  errores.nombre_completo  = 'Requerido'
  if (!form.ramo_id)          errores.ramo_id          = 'Requerido'
  if (!form.aseguradora_id)   errores.aseguradora_id   = 'Requerido'
  if (!form.producto_id)      errores.producto_id      = 'Requerido'
  if (!form.estado_id)        errores.estado_id        = 'Requerido'
  if (!form.responsable_id)   errores.responsable_id   = 'Requerido'
  if (!form.fecha_solicitud)  errores.fecha_solicitud  = 'Requerido'

  if (form.prima && (isNaN(form.prima) || parseFloat(form.prima) <= 0)) {
    errores.prima = 'Debe ser un valor positivo'
  }

  if (form.fecha_expedicion && form.fecha_solicitud) {
    if (new Date(form.fecha_expedicion) < new Date(form.fecha_solicitud)) {
      errores.fecha_expedicion = 'No puede ser anterior a la fecha de solicitud'
    }
  }

  return errores
}

// ── Skeleton de sección ───────────────────────────────────
function SeccionSkeleton() {
  return (
    <div className="poliza-form__seccion">
      <div className="poliza-form__skeleton-header" />
      <div className="poliza-form__skeleton-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="poliza-form__skeleton-campo" />
        ))}
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────
export default function PolizaForm() {
  const { id } = useParams()
  const esEdicion = Boolean(id)
  const navigate  = useNavigate()
  const { usuario, esAdmin } = useAuth()

  const [form, setForm]       = useState(FORM_INICIAL)
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando]   = useState(true)
  const [errorCarga, setErrorCarga] = useState(null)

  // Catálogos dinámicos
  const [catalogos, setCatalogos] = useState({
    estados: [], aseguradoras: [], productos: [],
    ramos: [], tiposDoc: [], asesores: [],
  })

  // Estado de búsqueda de cliente
  const [clienteEncontrado, setClienteEncontrado] = useState(null)
  const [buscandoCliente, setBuscandoCliente]     = useState(false)

  // Traspaso
  const [mostrarTraspaso, setMostrarTraspaso] = useState(false)
  const [motivoTraspaso, setMotivoTraspaso]   = useState('')
  const [errorMotivo, setErrorMotivo]         = useState('')

  // ── Carga inicial: catálogos + póliza si es edición ───
  useEffect(() => {
    let cancelado = false

    async function cargarTodo() {
      try {
        setCargando(true)
        setErrorCarga(null)

        // Catálogos y póliza en paralelo si es edición
        const [cats, polizaData] = await Promise.all([
          obtenerTodosCatalogos(),
          esEdicion ? obtenerPoliza(id) : Promise.resolve(null),
        ])

        if (cancelado) return

        setCatalogos(cats)

        if (esEdicion && polizaData) {
          // Resolver IDs desde los catálogos recién cargados
          // En backend real los IDs vendrán directos en polizaData
          const ramoId        = cats.ramos.find(r => r.nombre === polizaData.ramo)?.id        || ''
          const aseguradoraId = cats.aseguradoras.find(a => a.nombre === polizaData.aseguradora)?.id || ''
          const productoId    = cats.productos.find(p => p.nombre === polizaData.producto)?.id     || ''
          const estadoId      = cats.estados.find(e => e.nombre === polizaData.estado)?.id         || ''

          setForm({
            tipo_documento:   'CC',
            numero_documento: polizaData.cliente_documento,
            nombre_completo:  polizaData.cliente_nombre,
            celular:          polizaData.cliente_celular || '',
            asegurado_nombre: polizaData.asegurado_nombre || '',
            ramo_id:          String(ramoId),
            aseguradora_id:   String(aseguradoraId),
            producto_id:      String(productoId),
            estado_id:        String(estadoId),
            responsable_id:   String(polizaData.responsable_id),
            fecha_solicitud:  polizaData.fecha_solicitud || '',
            fecha_expedicion: polizaData.fecha_expedicion || '',
            numero_poliza:    polizaData.numero_poliza || '',
            prima:            polizaData.prima ? String(polizaData.prima) : '',
            observacion:      polizaData.observacion || '',
            version:          polizaData.version,
          })
        } else if (!esEdicion && !esAdmin) {
          // Asesor: asignar responsable automáticamente
          setForm(prev => ({ ...prev, responsable_id: String(usuario.id) }))
        }
      } catch (err) {
        if (!cancelado) {
          if (err?.response?.status === 404) {
            navigate('/produccion')
          } else {
            setErrorCarga('No se pudieron cargar los datos del formulario.')
          }
        }
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargarTodo()
    return () => { cancelado = true }
  }, [id, esEdicion, esAdmin, usuario?.id, navigate])

  // ── Cambio de campo ───────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errores[name]) setErrores(prev => ({ ...prev, [name]: undefined }))
  }

  // ── Búsqueda de cliente ───────────────────────────────
  const buscarCliente = async () => {
    if (!form.numero_documento.trim()) return
    setBuscandoCliente(true)
    try {
      const encontrado = await buscarClientePorDocumento(form.numero_documento)
      if (encontrado) {
        setClienteEncontrado(true)
        setForm(prev => ({
          ...prev,
          nombre_completo:  encontrado.nombre_completo,
          celular:          encontrado.celular || '',
          asegurado_nombre: encontrado.nombre_completo,
        }))
      } else {
        setClienteEncontrado(false)
      }
    } finally {
      setBuscandoCliente(false)
    }
  }

  // ── Traspaso ──────────────────────────────────────────
  const aplicarTraspaso = (nuevoResponsableId) => {
    if (!motivoTraspaso.trim()) {
      setErrorMotivo('El motivo del traspaso es obligatorio')
      return
    }
    setForm(prev => ({ ...prev, responsable_id: nuevoResponsableId }))
    setMostrarTraspaso(false)
    setMotivoTraspaso('')
    setErrorMotivo('')
  }

  // ── Submit ────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    const erroresForm = validar(form)
    if (Object.keys(erroresForm).length > 0) {
      setErrores(erroresForm)
      const primerError = document.querySelector('.form-campo--error')
      if (primerError) primerError.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setGuardando(true)
    try {
      if (esEdicion) {
        await editarPoliza(id, form)
      } else {
        await crearPoliza(form)
      }
      navigate('/produccion')
    } catch (err) {
      if (err?.response?.status === 409) {
        alert(err.response.data.detail)
      }
      setGuardando(false)
    }
  }

  const responsableActual = catalogos.asesores.find(
    a => a.id === parseInt(form.responsable_id)
  )

  // ── Error de carga ────────────────────────────────────
  if (errorCarga) {
    return (
      <div className="poliza-form">
        <div className="poliza-form__error-carga">
          <i className="bi bi-wifi-off" />
          <p>{errorCarga}</p>
          <button className="btn-secundario" onClick={() => window.location.reload()}>
            <i className="bi bi-arrow-clockwise" /> Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="poliza-form">

      {/* ── Indicador de modo ──────────────────────── */}
      <div className="poliza-form__modo">
        {esEdicion ? (
          <>
            <span className="poliza-form__modo-badge poliza-form__modo-badge--edicion">
              <i className="bi bi-pencil" /> Editando póliza
            </span>
            <span className="poliza-form__modo-id">ID #{id}</span>
          </>
        ) : (
          <span className="poliza-form__modo-badge poliza-form__modo-badge--nueva">
            <i className="bi bi-plus-circle" /> Nueva póliza
          </span>
        )}
      </div>

      {/* ── Skeletons mientras carga ───────────────── */}
      {cargando ? (
        <div className="poliza-form__form">
          <SeccionSkeleton />
          <SeccionSkeleton />
          <SeccionSkeleton />
        </div>
      ) : (
        <form className="poliza-form__form" onSubmit={handleSubmit} noValidate>

          {/* ══════════════════════════════════════════
              SECCIÓN 1 — DATOS DEL CLIENTE
          ══════════════════════════════════════════ */}
          <section className="poliza-form__seccion">
            <div className="poliza-form__seccion-header">
              <i className="bi bi-person-circle" />
              <h2>Datos del cliente</h2>
              <span className="poliza-form__seccion-hint">
                Busca por cédula para autocompletar
              </span>
            </div>

            <div className="poliza-form__grid">

              <div className="poliza-form__fila">
                <Campo label="Tipo de documento" error={errores.tipo_documento} requerido>
                  <select name="tipo_documento" value={form.tipo_documento} onChange={handleChange}>
                    <option value="">Seleccionar</option>
                    {catalogos.tiposDoc.map(t => (
                      <option key={t.id} value={t.nombre}>{t.nombre}</option>
                    ))}
                  </select>
                </Campo>

                <Campo label="Número de documento" error={errores.numero_documento} requerido>
                  <div className="poliza-form__input-accion">
                    <input
                      name="numero_documento"
                      type="text"
                      placeholder="Ej: 1098234567"
                      value={form.numero_documento}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      className="poliza-form__btn-buscar"
                      onClick={buscarCliente}
                      disabled={buscandoCliente || !form.numero_documento}
                      title="Buscar cliente existente"
                    >
                      {buscandoCliente
                        ? <div className="spinner" />
                        : <i className="bi bi-search" />
                      }
                    </button>
                  </div>
                  {clienteEncontrado === true && (
                    <p className="poliza-form__cliente-ok">
                      <i className="bi bi-check-circle-fill" /> Cliente encontrado — datos cargados
                    </p>
                  )}
                  {clienteEncontrado === false && (
                    <p className="poliza-form__cliente-nuevo">
                      <i className="bi bi-info-circle" /> Cliente nuevo — completa los datos
                    </p>
                  )}
                </Campo>
              </div>

              <Campo label="Nombre completo del tomador" error={errores.nombre_completo} requerido>
                <input
                  name="nombre_completo"
                  type="text"
                  placeholder="Nombre y apellidos"
                  value={form.nombre_completo}
                  onChange={handleChange}
                />
              </Campo>

              <div className="poliza-form__fila">
                <Campo label="Celular">
                  <input
                    name="celular"
                    type="tel"
                    placeholder="3XXXXXXXXX"
                    value={form.celular}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label="Nombre del asegurado">
                  <input
                    name="asegurado_nombre"
                    type="text"
                    placeholder="Si difiere del tomador"
                    value={form.asegurado_nombre}
                    onChange={handleChange}
                  />
                </Campo>
              </div>

            </div>
          </section>

          {/* ══════════════════════════════════════════
              SECCIÓN 2 — DATOS DE LA PÓLIZA
          ══════════════════════════════════════════ */}
          <section className="poliza-form__seccion">
            <div className="poliza-form__seccion-header">
              <i className="bi bi-file-earmark-check" />
              <h2>Datos de la póliza</h2>
            </div>

            <div className="poliza-form__grid">

              <div className="poliza-form__fila">
                <Campo label="Aseguradora" error={errores.aseguradora_id} requerido>
                  <select name="aseguradora_id" value={form.aseguradora_id} onChange={handleChange}>
                    <option value="">Seleccionar</option>
                    {catalogos.aseguradoras.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </Campo>

                <Campo label="Producto / Solución" error={errores.producto_id} requerido>
                  <select name="producto_id" value={form.producto_id} onChange={handleChange}>
                    <option value="">Seleccionar</option>
                    {catalogos.productos.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </Campo>
              </div>

              <div className="poliza-form__fila">
                <Campo label="Ramo" error={errores.ramo_id} requerido>
                  <select name="ramo_id" value={form.ramo_id} onChange={handleChange}>
                    <option value="">Seleccionar</option>
                    {catalogos.ramos.map(r => (
                      <option key={r.id} value={r.id}>{r.nombre}</option>
                    ))}
                  </select>
                </Campo>

                <Campo label="Estado" error={errores.estado_id} requerido>
                  <select name="estado_id" value={form.estado_id} onChange={handleChange}>
                    <option value="">Seleccionar</option>
                    {catalogos.estados.map(e => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                  </select>
                </Campo>
              </div>

            </div>
          </section>

          {/* ══════════════════════════════════════════
              SECCIÓN 3 — FECHAS (REQ-04)
          ══════════════════════════════════════════ */}
          <section className="poliza-form__seccion">
            <div className="poliza-form__seccion-header">
              <i className="bi bi-calendar3" />
              <h2>Fechas</h2>
              <span className="poliza-form__seccion-hint">
                La expedición puede completarse después
              </span>
            </div>

            <div className="poliza-form__grid">
              <div className="poliza-form__fila">
                <Campo label="Fecha de solicitud" error={errores.fecha_solicitud} requerido>
                  <input
                    name="fecha_solicitud"
                    type="date"
                    value={form.fecha_solicitud}
                    onChange={handleChange}
                  />
                </Campo>

                <Campo
                  label="Fecha de expedición"
                  error={errores.fecha_expedicion}
                  hint="Se completa cuando la aseguradora notifica"
                >
                  <input
                    name="fecha_expedicion"
                    type="date"
                    value={form.fecha_expedicion}
                    onChange={handleChange}
                    min={form.fecha_solicitud}
                  />
                </Campo>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════
              SECCIÓN 4 — CAMPOS DIFERIDOS (REQ-02)
          ══════════════════════════════════════════ */}
          <section className="poliza-form__seccion">
            <div className="poliza-form__seccion-header">
              <i className="bi bi-hourglass-split" />
              <h2>Número y prima</h2>
              <span className="poliza-form__seccion-hint--diferido">
                <i className="bi bi-info-circle" />
                Opcionales — se completan tras la expedición
              </span>
            </div>

            <div className="poliza-form__grid">
              <div className="poliza-form__fila">
                <Campo label="Número de póliza" error={errores.numero_poliza}>
                  <input
                    name="numero_poliza"
                    type="text"
                    placeholder="Ej: SUV-2025-001234"
                    value={form.numero_poliza}
                    onChange={handleChange}
                  />
                </Campo>

                <Campo label="Prima sin IVA (COP)" error={errores.prima}>
                  <input
                    name="prima"
                    type="number"
                    placeholder="Ej: 285000"
                    value={form.prima}
                    onChange={handleChange}
                    min="0"
                    step="1000"
                  />
                </Campo>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════
              SECCIÓN 5 — RESPONSABLE Y TRASPASO
          ══════════════════════════════════════════ */}
          <section className="poliza-form__seccion">
            <div className="poliza-form__seccion-header">
              <i className="bi bi-person-badge" />
              <h2>Responsable</h2>
            </div>

            <div className="poliza-form__grid">
              <div className="poliza-form__fila poliza-form__fila--responsable">

                <Campo label="Asesor responsable" error={errores.responsable_id} requerido>
                  <select
                    name="responsable_id"
                    value={form.responsable_id}
                    onChange={handleChange}
                    disabled={!esAdmin && !esEdicion}
                  >
                    <option value="">Seleccionar asesor</option>
                    {catalogos.asesores.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                  {!esAdmin && !esEdicion && (
                    <p className="poliza-form__campo-hint">
                      Se asigna automáticamente a tu usuario
                    </p>
                  )}
                </Campo>

                {esEdicion && esAdmin && (
                  <div className="poliza-form__traspaso-wrap">
                    <button
                      type="button"
                      className="poliza-form__btn-traspaso"
                      onClick={() => setMostrarTraspaso(!mostrarTraspaso)}
                    >
                      <i className="bi bi-arrow-left-right" />
                      <span>Traspasar a otro asesor</span>
                    </button>
                  </div>
                )}
              </div>

              {mostrarTraspaso && (
                <div className="poliza-form__traspaso-panel">
                  <div className="poliza-form__traspaso-header">
                    <i className="bi bi-arrow-left-right" />
                    <strong>Traspaso de responsable</strong>
                  </div>

                  {responsableActual && (
                    <p className="poliza-form__traspaso-actual">
                      Responsable actual: <strong>{responsableActual.nombre}</strong>
                    </p>
                  )}

                  <div className="poliza-form__traspaso-campos">
                    <select
                      className="poliza-form__traspaso-select"
                      defaultValue=""
                      onChange={(e) => { if (e.target.value) aplicarTraspaso(e.target.value) }}
                    >
                      <option value="">Seleccionar nuevo asesor...</option>
                      {catalogos.asesores
                        .filter(a => a.id !== parseInt(form.responsable_id))
                        .map(a => (
                          <option key={a.id} value={a.id}>{a.nombre} ({a.rol})</option>
                        ))
                      }
                    </select>

                    <div className="poliza-form__traspaso-motivo">
                      <label>
                        Motivo del traspaso <span className="campo-requerido">*</span>
                      </label>
                      <textarea
                        placeholder="Explica el motivo del traspaso (obligatorio)..."
                        value={motivoTraspaso}
                        onChange={(e) => {
                          setMotivoTraspaso(e.target.value)
                          if (errorMotivo) setErrorMotivo('')
                        }}
                        rows={3}
                      />
                      {errorMotivo && (
                        <p className="campo-error-msg">
                          <i className="bi bi-exclamation-circle" /> {errorMotivo}
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="poliza-form__traspaso-aviso">
                    <i className="bi bi-info-circle" />
                    El traspaso quedará registrado en el historial con fecha, motivo y usuario que lo realizó.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ══════════════════════════════════════════
              SECCIÓN 6 — OBSERVACIONES
          ══════════════════════════════════════════ */}
          <section className="poliza-form__seccion">
            <div className="poliza-form__seccion-header">
              <i className="bi bi-chat-left-text" />
              <h2>Observaciones</h2>
            </div>

            <Campo label="Observación">
              <textarea
                name="observacion"
                placeholder="Notas relevantes sobre esta póliza..."
                value={form.observacion}
                onChange={handleChange}
                rows={4}
              />
            </Campo>
          </section>

          {/* ── Acciones ──────────────────────────── */}
          <div className="poliza-form__acciones">
            <button
              type="button"
              className="btn-secundario"
              onClick={() => navigate('/produccion')}
              disabled={guardando}
            >
              <i className="bi bi-x" /> Cancelar
            </button>

            <button type="submit" className="btn-primario" disabled={guardando}>
              {guardando ? (
                <><div className="spinner" /> Guardando...</>
              ) : (
                <><i className="bi bi-check-lg" /> {esEdicion ? 'Guardar cambios' : 'Crear póliza'}</>
              )}
            </button>
          </div>

        </form>
      )}
    </div>
  )
}

// ── Componente Campo reutilizable ─────────────────────────
function Campo({ label, error, hint, requerido, children }) {
  return (
    <div className={`form-campo ${error ? 'form-campo--error' : ''}`}>
      <label className="form-campo__label">
        {label}
        {requerido && <span className="campo-requerido"> *</span>}
      </label>
      {children}
      {error && (
        <p className="campo-error-msg">
          <i className="bi bi-exclamation-circle" /> {error}
        </p>
      )}
      {hint && !error && (
        <p className="poliza-form__campo-hint">{hint}</p>
      )}
    </div>
  )
}