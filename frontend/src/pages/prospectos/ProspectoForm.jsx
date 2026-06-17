// ============================================================
// src/pages/prospectos/ProspectoForm.jsx
// M3 — Crear / Editar prospecto
// Ruta crear: /prospectos/nuevo
// Ruta editar: /prospectos/:id/editar
// Datos: api/prospectos.js + api/catalogos.js
// ============================================================

import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  crearProspecto,
  editarProspecto,
  obtenerProspecto,
  ESTADOS_PIPELINE,
  CANALES_ORIGEN,
} from '../../api/prospectos.js'
import { obtenerTodosCatalogos } from '../../api/catalogos.js'
import './ProspectoForm.css'

// ── Validaciones ──────────────────────────────────────────
function validar(campos, esAdmin) {
  const errores = {}
  if (!campos.nombre?.trim())
    errores.nombre = 'El nombre es requerido.'
  if (!campos.numero_documento?.trim())
    errores.numero_documento = 'El número de documento es requerido.'
  if (!campos.tipo_documento_id)
    errores.tipo_documento_id = 'Selecciona el tipo de documento.'
  if (!campos.telefono?.trim())
    errores.telefono = 'El teléfono es requerido.'
  if (campos.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campos.correo))
    errores.correo = 'Correo electrónico no válido.'
  if (!campos.canal_origen)
    errores.canal_origen = 'Selecciona el canal de origen.'
  if (esAdmin && !campos.responsable_id)
    errores.responsable_id = 'Debes asignar un asesor.'
  return errores
}

// ── Valor inicial del formulario ──────────────────────────
const FORM_VACIO = {
  nombre:                  '',
  tipo_documento_id:       '',
  numero_documento:        '',
  telefono:                '',
  correo:                  '',
  ocupacion:               '',
  ciudad:                  '',
  canal_origen:            'manual',
  responsable_id:          '',
  aseguradora_interes_id:  '',
  ramo_interes_id:         '',
  observaciones:           '',
}

// ── Sub-componente campo con error ────────────────────────
function Campo({ label, error, requerido, children }) {
  return (
    <div className={`pform-campo ${error ? 'pform-campo--error' : ''}`}>
      <label className="pform-label">
        {label}
        {requerido && <span className="pform-requerido" aria-hidden="true">*</span>}
      </label>
      {children}
      {error && (
        <span className="pform-error-msg" role="alert">
          <i className="bi bi-exclamation-circle" /> {error}
        </span>
      )}
    </div>
  )
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function ProspectoForm() {
  const navigate          = useNavigate()
  const { id }            = useParams()
  const { usuario, esAdmin } = useAuth()
  const esEdicion         = Boolean(id)

  // ── Estado ────────────────────────────────────────────
  const [campos, setCampos]         = useState(FORM_VACIO)
  const [errores, setErrores]       = useState({})
  const [catalogos, setCatalogos]   = useState({
    tipos_documento: [],
    aseguradoras:    [],
    ramos:           [],
    asesores:        [],   // Sammy: GET /api/v1/usuarios?rol=ASESOR
  })
  const [cargando, setCargando]     = useState(esEdicion)
  const [guardando, setGuardando]   = useState(false)
  const [errorGlobal, setErrorGlobal] = useState(null)

  // ── Carga catálogos y datos en edición ────────────────
  useEffect(() => {
    async function init() {
      try {
        // Catálogos — reutiliza obtenerTodosCatalogos de api/catalogos.js
        const cats = await obtenerTodosCatalogos()
        setCatalogos({
          tipos_documento: cats.tipos_documento ?? [],
          aseguradoras:    cats.aseguradoras    ?? [],
          ramos:           cats.ramos           ?? [],
          // Sammy: agregar asesores al endpoint obtenerTodosCatalogos
          // o hacer un fetch separado a /api/v1/usuarios?rol=ASESOR
          asesores: [
            { id: 2, nombre: 'Gina López' },
            { id: 3, nombre: 'Diego Martínez' },
            { id: 4, nombre: 'Dilma Suárez' },
            { id: 5, nombre: 'Julieta Mora' },
            { id: 6, nombre: 'Lina Castro' },
          ],
        })

        // Si es edición, carga los datos del prospecto
        if (esEdicion) {
          const p = await obtenerProspecto(id)
          setCampos({
            nombre:                 p.nombre                          ?? '',
            tipo_documento_id:      String(p.tipo_documento_id ?? '')  ,
            numero_documento:       p.numero_documento                 ?? '',
            telefono:               p.telefono                         ?? '',
            correo:                 p.correo                           ?? '',
            ocupacion:              p.ocupacion                        ?? '',
            ciudad:                 p.ciudad                           ?? '',
            canal_origen:           p.canal_origen                     ?? 'manual',
            responsable_id:         String(p.responsable_id ?? '')     ,
            aseguradora_interes_id: String(p.aseguradora_interes_id ?? ''),
            ramo_interes_id:        String(p.ramo_interes_id ?? '')    ,
            observaciones:          p.observaciones                    ?? '',
          })
        } else if (!esAdmin) {
          // Asesor: se asigna a sí mismo automáticamente
          setCampos((prev) => ({ ...prev, responsable_id: String(usuario?.id ?? '') }))
        }
      } catch (e) {
        setErrorGlobal('No se pudieron cargar los datos. Intenta de nuevo.')
        console.error('[ProspectoForm]', e)
      } finally {
        setCargando(false)
      }
    }
    init()
  }, [id, esEdicion, esAdmin, usuario?.id])

  // ── Handlers ──────────────────────────────────────────
  function onChange(e) {
    const { name, value } = e.target
    setCampos((prev) => ({ ...prev, [name]: value }))
    // Limpia el error del campo al editar
    if (errores[name]) setErrores((prev) => ({ ...prev, [name]: undefined }))
  }

  async function onGuardar(e) {
    e.preventDefault()
    setErrorGlobal(null)

    const nuevosErrores = validar(campos, esAdmin)
    if (Object.keys(nuevosErrores).length) {
      setErrores(nuevosErrores)
      // Foco al primer campo con error
      const primerCampo = document.querySelector('.pform-campo--error input, .pform-campo--error select, .pform-campo--error textarea')
      primerCampo?.focus()
      return
    }

    setGuardando(true)
    try {
      const payload = {
        ...campos,
        tipo_documento_id:       Number(campos.tipo_documento_id) || null,
        responsable_id:          Number(campos.responsable_id)    || null,
        aseguradora_interes_id:  Number(campos.aseguradora_interes_id) || null,
        ramo_interes_id:         Number(campos.ramo_interes_id)   || null,
        correo:                  campos.correo     || null,
        ocupacion:               campos.ocupacion  || null,
        ciudad:                  campos.ciudad     || null,
        observaciones:           campos.observaciones || null,
      }

      if (esEdicion) {
        await editarProspecto(id, payload)
        navigate(`/prospectos/${id}`)
      } else {
        const nuevo = await crearProspecto(payload)
        navigate(`/prospectos/${nuevo.id}`)
      }
    } catch (err) {
      setErrorGlobal(err?.response?.data?.detail ?? 'Error al guardar. Intenta de nuevo.')
      console.error('[ProspectoForm guardar]', err)
    } finally {
      setGuardando(false)
    }
  }

  // ── Loading / Error global ────────────────────────────
  if (cargando) {
    return (
      <div className="pform-loading">
        <div className="pform-spinner" />
        <span>Cargando datos…</span>
      </div>
    )
  }

  if (errorGlobal && esEdicion && !campos.nombre) {
    return (
      <div className="pform-error-page">
        <i className="bi bi-exclamation-triangle" />
        <p>{errorGlobal}</p>
        <button className="btn-secundario" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left" /> Volver
        </button>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────
  return (
    <div className="pform page-enter">

      {/* ── Encabezado ── */}
      <div className="pform-header">
        <button
          className="pform-header__back"
          onClick={() => navigate(esEdicion ? `/prospectos/${id}` : '/prospectos')}
          aria-label="Volver"
        >
          <i className="bi bi-arrow-left" />
        </button>
        <div>
          <h2 className="pform-header__titulo">
            {esEdicion ? 'Editar prospecto' : 'Nuevo prospecto'}
          </h2>
          <p className="pform-header__sub">
            {esEdicion
              ? 'Actualiza los datos del prospecto'
              : 'Completa los datos para registrar un nuevo prospecto'}
          </p>
        </div>
      </div>

      {/* Error global no bloqueante */}
      {errorGlobal && (
        <div className="pform-banner-error" role="alert">
          <i className="bi bi-exclamation-triangle-fill" />
          {errorGlobal}
        </div>
      )}

      <form className="pform-form" onSubmit={onGuardar} noValidate>

        {/* ════════════════════════════════════════════
            SECCIÓN 1 — Datos del prospecto
        ════════════════════════════════════════════ */}
        <section className="pform-seccion">
          <h3 className="pform-seccion__titulo">
            <i className="bi bi-person" /> Datos del prospecto
          </h3>

          <div className="pform-grid pform-grid--3">
            <Campo label="Nombre completo" requerido error={errores.nombre}>
              <input
                type="text"
                name="nombre"
                value={campos.nombre}
                onChange={onChange}
                placeholder="Juan Fernando Zapata"
                autoComplete="off"
                autoFocus={!esEdicion}
              />
            </Campo>

            <Campo label="Tipo de documento" requerido error={errores.tipo_documento_id}>
              <select name="tipo_documento_id" value={campos.tipo_documento_id} onChange={onChange}>
                <option value="">Seleccionar…</option>
                {catalogos.tipos_documento.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </Campo>

            <Campo label="Número de documento" requerido error={errores.numero_documento}>
              <input
                type="text"
                name="numero_documento"
                value={campos.numero_documento}
                onChange={onChange}
                placeholder="1023456789"
                autoComplete="off"
              />
            </Campo>
          </div>

          <div className="pform-grid pform-grid--3">
            <Campo label="Teléfono / celular" requerido error={errores.telefono}>
              <input
                type="tel"
                name="telefono"
                value={campos.telefono}
                onChange={onChange}
                placeholder="300 123 4567"
              />
            </Campo>

            <Campo label="Correo electrónico" error={errores.correo}>
              <input
                type="email"
                name="correo"
                value={campos.correo}
                onChange={onChange}
                placeholder="correo@ejemplo.com"
              />
            </Campo>

            <Campo label="Ocupación">
              <input
                type="text"
                name="ocupacion"
                value={campos.ocupacion}
                onChange={onChange}
                placeholder="Comerciante, docente, etc."
              />
            </Campo>
          </div>

          <div className="pform-grid pform-grid--2">
            <Campo label="Ciudad">
              <input
                type="text"
                name="ciudad"
                value={campos.ciudad}
                onChange={onChange}
                placeholder="Bogotá, Medellín…"
              />
            </Campo>

            <Campo label="Canal de origen" requerido error={errores.canal_origen}>
              <select name="canal_origen" value={campos.canal_origen} onChange={onChange}>
                {CANALES_ORIGEN.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </Campo>
          </div>
        </section>

        {/* ════════════════════════════════════════════
            SECCIÓN 2 — Interés comercial
        ════════════════════════════════════════════ */}
        <section className="pform-seccion">
          <h3 className="pform-seccion__titulo">
            <i className="bi bi-shield" /> Interés comercial
          </h3>
          <p className="pform-seccion__hint">
            Opcional — ayuda a asignar el prospecto al asesor y ramo correctos.
          </p>

          <div className="pform-grid pform-grid--2">
            <Campo label="Aseguradora de interés">
              <select name="aseguradora_interes_id" value={campos.aseguradora_interes_id} onChange={onChange}>
                <option value="">Sin preferencia</option>
                {catalogos.aseguradoras.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </Campo>

            <Campo label="Ramo de interés">
              <select name="ramo_interes_id" value={campos.ramo_interes_id} onChange={onChange}>
                <option value="">Sin preferencia</option>
                {catalogos.ramos.map((r) => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </Campo>
          </div>
        </section>

        {/* ════════════════════════════════════════════
            SECCIÓN 3 — Asignación (solo ADMIN)
        ════════════════════════════════════════════ */}
        {esAdmin && (
          <section className="pform-seccion">
            <h3 className="pform-seccion__titulo">
              <i className="bi bi-person-badge" /> Asignación
            </h3>

            <div className="pform-grid pform-grid--2">
              <Campo label="Asesor responsable" requerido error={errores.responsable_id}>
                <select name="responsable_id" value={campos.responsable_id} onChange={onChange}>
                  <option value="">Seleccionar asesor…</option>
                  {catalogos.asesores.map((a) => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </Campo>

              {/* Canal — ya está arriba pero lo mostramos también aquí para ADMIN
                  en caso de que estén creando desde un canal específico */}
              <div className="pform-info-canal">
                <span className="pform-info-canal__label">Canal registrado</span>
                <span className={`pform-canal pform-canal--${campos.canal_origen}`}>
                  {CANALES_ORIGEN.find((c) => c.value === campos.canal_origen)?.label ?? '—'}
                </span>
                <span className="pform-info-canal__hint">
                  Se usará para métricas por canal. WhatsApp se asignará automáticamente cuando esté activo.
                </span>
              </div>
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════════
            SECCIÓN 4 — Observaciones
        ════════════════════════════════════════════ */}
        <section className="pform-seccion">
          <h3 className="pform-seccion__titulo">
            <i className="bi bi-chat-left-text" /> Observaciones
          </h3>

          <Campo label="Notas iniciales">
            <textarea
              name="observaciones"
              value={campos.observaciones}
              onChange={onChange}
              rows={3}
              placeholder="Contexto del primer contacto, producto de interés, fuente, etc."
            />
          </Campo>
        </section>

        {/* ── Footer con acciones ── */}
        <div className="pform-footer">
          <button
            type="button"
            className="btn-secundario"
            onClick={() => navigate(esEdicion ? `/prospectos/${id}` : '/prospectos')}
            disabled={guardando}
          >
            Cancelar
          </button>
          <button type="submit" className="btn-primario" disabled={guardando}>
            {guardando
              ? <><div className="pform-btn-spinner" /> Guardando…</>
              : <><i className="bi bi-check-lg" /> {esEdicion ? 'Guardar cambios' : 'Crear prospecto'}</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}