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
  eliminarFormulario,
} from '../../api/formularios.js'
import Toast from '../../components/Toast.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import './Formularios.css'

const NUEVO_VACIO = { titulo: '', descripcion: '' }

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

export default function Formularios() {
  const navigate = useNavigate()

  const [formularios, setFormularios] = useState([])
  const [cargando, setCargando]       = useState(true)
  const [error, setError]             = useState(null)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [nuevo, setNuevo]             = useState(NUEVO_VACIO)
  const [creando, setCreando]         = useState(false)
  const [errorCrear, setErrorCrear]   = useState(null)

  const [copiadoId, setCopiadoId]     = useState(null)
  const [toast, setToast]             = useState(null)
  const [confirmacion, setConfirmacion] = useState(null)

  const cargar = useCallback(async () => {
    try {
      setCargando(true)
      setError(null)
      const data = await listarFormularios()
      setFormularios(data)
    } catch (e) {
      setError('No se pudieron cargar los formularios.')
      console.error('[Formularios]', e)
    } finally {
      setCargando(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, mismo patrón que Prospectos.jsx (ver DT-018)
  useEffect(() => { cargar() }, [cargar])

  async function handleCrear(e) {
    e.preventDefault()
    if (!nuevo.titulo.trim()) {
      setErrorCrear('El título es obligatorio.')
      return
    }
    try {
      setCreando(true)
      setErrorCrear(null)
      const creado = await crearFormulario({
        titulo: nuevo.titulo.trim(),
        descripcion: nuevo.descripcion.trim() || null,
      })
      navigate(`/admin/formularios/${creado.id}/editar`)
    } catch (err) {
      setErrorCrear(err.response?.data?.detail || 'No se pudo crear el formulario.')
    } finally {
      setCreando(false)
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
        <button className="form-btn-primario" onClick={() => setModalAbierto(true)}>
          <i className="bi bi-plus-lg" /> Nuevo formulario
        </button>
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
                <th>Estado</th>
                <th>Creado</th>
                <th style={{ width: '1%' }}>URL pública</th>
                <th style={{ width: '1%' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}><td colSpan={5} className="formularios__skeleton-fila" /></tr>
                  ))
                : formularios.length === 0
                  ? (
                    <tr>
                      <td colSpan={5} className="formularios__vacio">
                        <i className="bi bi-file-earmark-text" /> No hay formularios todavía
                      </td>
                    </tr>
                  )
                  : formularios.map((f) => (
                    <tr key={f.id} className="formularios__fila" onClick={() => navigate(`/admin/formularios/${f.id}/editar`)}>
                      <td>
                        <span className="formularios__nombre">{f.titulo}</span>
                        {f.descripcion && <span className="formularios__descripcion">{f.descripcion}</span>}
                      </td>
                      <td><BadgeEstado estado={f.estado} /></td>
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
                            title="Ver respuestas"
                            onClick={() => navigate(`/admin/formularios/${f.id}/respuestas`)}
                          >
                            <i className="bi bi-inbox" />
                          </button>
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

      <Toast toast={toast} onCerrar={() => setToast(null)} />
      <ConfirmDialog confirmacion={confirmacion} onCancelar={() => setConfirmacion(null)} />
    </div>
  )
}
