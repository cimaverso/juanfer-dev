// ============================================================
// src/pages/admin/ConfiguracionEmpresa.jsx
// Grupo "Empresa" de Configuración (solo ADMIN):
//   - Datos de la empresa: backend real (DT-023a pagada):
//     GET /empresa (cualquier autenticado), PUT /empresa (ADMIN).
//   - Usuarios: lista real (GET /usuarios) con acción de
//     "Restablecer contraseña". Backend real (DT-023b pagada):
//     POST /usuarios/{id}/generar-codigo-reset genera un código de
//     un solo uso que el admin entrega al usuario por un canal
//     seguro; el usuario lo usa en /restablecer-password para
//     definir su propia contraseña nueva (pages/auth/RestablecerPassword.jsx).
//   - Horarios: vista de solo lectura de la disponibilidad de TODO
//     el equipo. Cada usuario edita el suyo en Mi Perfil → Horario
//     (pages/perfil/MiPerfil.jsx); aquí el admin solo mira.
//     Backend real (DT-022 pagada): GET /horarios.
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { invalidarCatalogos } from '../../api/catalogos.js'
import { obtenerHorariosEquipo } from '../../api/horarios.js'
import { obtenerEmpresa, guardarEmpresa } from '../../api/empresa.js'
import { listarUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario, generarCodigoReset } from '../../api/usuarios.js'
import Toast from '../../components/Toast.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import './ConfiguracionEmpresa.css'

const DIAS_LABEL = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue',
  viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom',
}

// ============================================================
// DATOS DE LA EMPRESA
// ============================================================
const EMPRESA_VACIA = { nombre: '', nit: '', direccion: '', telefono: '', correo: '' }

function aFormulario(datos) {
  return {
    nombre: datos.nombre || '',
    nit: datos.nit || '',
    direccion: datos.direccion || '',
    telefono: datos.telefono || '',
    correo: datos.correo || '',
  }
}

export function DatosEmpresa() {
  const [empresa, setEmpresa] = useState(EMPRESA_VACIA)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [toast, setToast]     = useState(null)

  const cargar = useCallback(async () => {
    try {
      setCargando(true)
      const datos = await obtenerEmpresa()
      setEmpresa(aFormulario(datos))
    } catch {
      setToast({ tipo: 'error', mensaje: 'No se pudieron cargar los datos de la empresa.' })
    } finally {
      setCargando(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, mismo patrón que Prospectos.jsx (ver DT-018)
  useEffect(() => { cargar() }, [cargar])

  function cambiar(campo, valor) {
    setEmpresa((prev) => ({ ...prev, [campo]: valor }))
  }

  async function guardar(e) {
    e.preventDefault()
    try {
      setGuardando(true)
      const datos = await guardarEmpresa(empresa)
      setEmpresa(aFormulario(datos))
      setToast({ tipo: 'exito', mensaje: 'Datos de la empresa guardados.' })
    } catch {
      setToast({ tipo: 'error', mensaje: 'No se pudo guardar.' })
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return <div className="emp-seccion"><p className="emp-sub">Cargando…</p></div>
  }

  return (
    <>
      <div className="emp-seccion">
        <form className="emp-form" onSubmit={guardar}>
          <label className="emp-campo">
            <span>Nombre de la empresa</span>
            <input type="text" value={empresa.nombre} onChange={(e) => cambiar('nombre', e.target.value)} />
          </label>
          <label className="emp-campo">
            <span>NIT</span>
            <input type="text" value={empresa.nit} onChange={(e) => cambiar('nit', e.target.value)} />
          </label>
          <label className="emp-campo">
            <span>Dirección</span>
            <input type="text" value={empresa.direccion} onChange={(e) => cambiar('direccion', e.target.value)} />
          </label>
          <label className="emp-campo">
            <span>Teléfono</span>
            <input type="text" value={empresa.telefono} onChange={(e) => cambiar('telefono', e.target.value)} />
          </label>
          <label className="emp-campo">
            <span>Correo de contacto</span>
            <input type="email" value={empresa.correo} onChange={(e) => cambiar('correo', e.target.value)} />
          </label>
          <button type="submit" className="emp-btn-primario" disabled={guardando}>
            <i className="bi bi-check-lg" /> {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </form>
      </div>
      <Toast toast={toast} onCerrar={() => setToast(null)} />
    </>
  )
}

// ============================================================
// USUARIOS — lista + crear + restablecer contraseña (clave dinámica)
// ============================================================
const NUEVO_USUARIO_VACIO = { nombre: '', email: '', password: '', rol: 'ASESOR' }

export function UsuariosEmpresa() {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState(null)
  const [codigoGenerado, setCodigoGenerado] = useState(null) // { usuario, codigo }
  const [generando, setGenerando] = useState(false)

  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false)
  const [nuevoUsuario, setNuevoUsuario] = useState(NUEVO_USUARIO_VACIO)
  const [creandoUsuario, setCreandoUsuario] = useState(false)
  const [errorCrearUsuario, setErrorCrearUsuario] = useState(null)

  const [usuarioEditando, setUsuarioEditando] = useState(null) // { id, nombre, email, rol }
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)
  const [errorEditarUsuario, setErrorEditarUsuario] = useState(null)

  const [confirmacion, setConfirmacion] = useState(null)

  const cargar = useCallback(async () => {
    try {
      setCargando(true)
      setError(null)
      const data = await listarUsuarios()
      setUsuarios(data)
    } catch (e) {
      setError('No se pudieron cargar los usuarios.')
      console.error('[ConfiguracionEmpresa]', e)
    } finally {
      setCargando(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, mismo patrón que Prospectos.jsx (ver DT-018)
  useEffect(() => { cargar() }, [cargar])

  async function restablecerClave(usuario) {
    try {
      setGenerando(true)
      const codigo = await generarCodigoReset(usuario.id)
      setCodigoGenerado({ usuario, codigo })
    } catch {
      setError('No se pudo generar el código.')
    } finally {
      setGenerando(false)
    }
  }

  function cerrarModalNuevo() {
    setModalNuevoAbierto(false)
    setNuevoUsuario(NUEVO_USUARIO_VACIO)
    setErrorCrearUsuario(null)
  }

  async function handleCrearUsuario(e) {
    e.preventDefault()
    if (!nuevoUsuario.nombre.trim() || !nuevoUsuario.email.trim()) {
      setErrorCrearUsuario('Nombre y correo son obligatorios.')
      return
    }
    if (nuevoUsuario.password.length < 6) {
      setErrorCrearUsuario('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    try {
      setCreandoUsuario(true)
      setErrorCrearUsuario(null)
      const creado = await crearUsuario({
        nombre: nuevoUsuario.nombre.trim(),
        email: nuevoUsuario.email.trim(),
        password: nuevoUsuario.password,
        rol: nuevoUsuario.rol,
      })
      setUsuarios((prev) => [...prev, creado])
      invalidarCatalogos('asesores')
      cerrarModalNuevo()
    } catch (err) {
      setErrorCrearUsuario(
        err.response?.data?.detail || 'No se pudo crear el usuario.'
      )
    } finally {
      setCreandoUsuario(false)
    }
  }

  function abrirEdicion(usuario) {
    setUsuarioEditando({ id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol })
    setErrorEditarUsuario(null)
  }

  function cerrarEdicion() {
    setUsuarioEditando(null)
    setErrorEditarUsuario(null)
  }

  async function handleActualizarUsuario(e) {
    e.preventDefault()
    if (!usuarioEditando.nombre.trim() || !usuarioEditando.email.trim()) {
      setErrorEditarUsuario('Nombre y correo son obligatorios.')
      return
    }
    try {
      setGuardandoEdicion(true)
      setErrorEditarUsuario(null)
      const actualizado = await actualizarUsuario(usuarioEditando.id, {
        nombre: usuarioEditando.nombre.trim(),
        email: usuarioEditando.email.trim(),
        rol: usuarioEditando.rol,
      })
      setUsuarios((prev) => prev.map((u) => (u.id === actualizado.id ? actualizado : u)))
      invalidarCatalogos('asesores')
      cerrarEdicion()
    } catch (err) {
      setErrorEditarUsuario(
        err.response?.data?.detail || 'No se pudo actualizar el usuario.'
      )
    } finally {
      setGuardandoEdicion(false)
    }
  }

  function pedirEliminar(usuario) {
    setConfirmacion({
      mensaje: `¿Eliminar a ${usuario.nombre}? No podrá volver a iniciar sesión.`,
      onConfirmar: async () => {
        setConfirmacion(null)
        try {
          await eliminarUsuario(usuario.id)
          setUsuarios((prev) => prev.filter((u) => u.id !== usuario.id))
          invalidarCatalogos('asesores')
        } catch (err) {
          setError(err.response?.data?.detail || 'No se pudo eliminar el usuario.')
        }
      },
    })
  }

  return (
    <>
      <div className="emp-seccion">
        <div className="emp-usuarios__header">
          <p className="emp-sub">Asesores y administradores con acceso al sistema.</p>
          <button className="emp-btn-primario emp-usuarios__btn-nuevo" onClick={() => setModalNuevoAbierto(true)}>
            <i className="bi bi-person-plus" /> Nuevo usuario
          </button>
        </div>
        {error ? (
          <p className="emp-sub">{error}</p>
        ) : cargando ? (
          <p className="emp-sub">Cargando…</p>
        ) : usuarios.length === 0 ? (
          <p className="emp-sub">Sin usuarios registrados.</p>
        ) : (
          <ul className="emp-usuarios">
            {usuarios.map((u) => (
              <li key={u.id} className="emp-usuarios__item">
                <div className="emp-usuarios__avatar">{u.iniciales}</div>
                <div className="emp-usuarios__info">
                  <span className="emp-usuarios__nombre">{u.nombre}</span>
                  <span className="emp-usuarios__email">{u.email}</span>
                </div>
                <span className={`emp-badge-rol ${u.rol === 'ADMIN' ? 'emp-badge-rol--admin' : ''}`}>
                  {u.rol === 'ADMIN' ? 'Administrador' : 'Asesor'}
                </span>
                <button className="emp-btn-secundario" onClick={() => restablecerClave(u)} disabled={generando}>
                  <i className="bi bi-key" /> Restablecer contraseña
                </button>
                <button className="emp-btn-icon" onClick={() => abrirEdicion(u)} aria-label="Editar usuario">
                  <i className="bi bi-pencil" />
                </button>
                <button className="emp-btn-icon" onClick={() => pedirEliminar(u)} aria-label="Eliminar usuario">
                  <i className="bi bi-trash" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {codigoGenerado && (
        <div className="emp-overlay" onClick={(e) => e.target === e.currentTarget && setCodigoGenerado(null)}>
          <div className="emp-modal" role="dialog" aria-modal="true">
            <div className="emp-modal__header">
              <span><i className="bi bi-key" /> Código de restablecimiento generado</span>
              <button className="emp-btn-icon" onClick={() => setCodigoGenerado(null)} aria-label="Cerrar">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="emp-modal__body">
              <p className="emp-sub">
                Entrégale este código a <strong>{codigoGenerado.usuario.nombre}</strong> por un canal seguro. Con su correo y este código podrá definir su nueva contraseña en la pantalla de inicio de sesión.
              </p>
              <div className="emp-clave">{codigoGenerado.codigo}</div>
              <p className="emp-aviso">
                <i className="bi bi-exclamation-triangle" /> El código vence en 60 minutos y solo se puede usar una vez.
              </p>
            </div>
          </div>
        </div>
      )}

      {modalNuevoAbierto && (
        <div className="emp-overlay" onClick={(e) => e.target === e.currentTarget && cerrarModalNuevo()}>
          <div className="emp-modal" role="dialog" aria-modal="true" aria-label="Nuevo usuario">
            <div className="emp-modal__header">
              <span><i className="bi bi-person-plus" /> Nuevo usuario</span>
              <button className="emp-btn-icon" onClick={cerrarModalNuevo} aria-label="Cerrar">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <form className="emp-modal__body emp-form" onSubmit={handleCrearUsuario}>
              <label className="emp-campo">
                <span>Nombre completo</span>
                <input
                  type="text"
                  autoFocus
                  value={nuevoUsuario.nombre}
                  onChange={(e) => setNuevoUsuario((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej. Camila Ríos"
                />
              </label>
              <label className="emp-campo">
                <span>Correo</span>
                <input
                  type="email"
                  value={nuevoUsuario.email}
                  onChange={(e) => setNuevoUsuario((p) => ({ ...p, email: e.target.value }))}
                  placeholder="nombre@juanfer.com"
                />
              </label>
              <label className="emp-campo">
                <span>Contraseña inicial</span>
                <input
                  type="password"
                  value={nuevoUsuario.password}
                  onChange={(e) => setNuevoUsuario((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                />
              </label>
              <label className="emp-campo">
                <span>Rol</span>
                <select
                  value={nuevoUsuario.rol}
                  onChange={(e) => setNuevoUsuario((p) => ({ ...p, rol: e.target.value }))}
                >
                  <option value="ASESOR">Asesor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </label>
              {errorCrearUsuario && <p className="emp-error-msg">{errorCrearUsuario}</p>}
              <div className="emp-modal__footer">
                <button type="button" className="emp-btn-secundario" onClick={cerrarModalNuevo}>
                  Cancelar
                </button>
                <button type="submit" className="emp-btn-primario" disabled={creandoUsuario}>
                  {creandoUsuario ? 'Creando…' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {usuarioEditando && (
        <div className="emp-overlay" onClick={(e) => e.target === e.currentTarget && cerrarEdicion()}>
          <div className="emp-modal" role="dialog" aria-modal="true" aria-label="Editar usuario">
            <div className="emp-modal__header">
              <span><i className="bi bi-pencil" /> Editar usuario</span>
              <button className="emp-btn-icon" onClick={cerrarEdicion} aria-label="Cerrar">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <form className="emp-modal__body emp-form" onSubmit={handleActualizarUsuario}>
              <label className="emp-campo">
                <span>Nombre completo</span>
                <input
                  type="text"
                  autoFocus
                  value={usuarioEditando.nombre}
                  onChange={(e) => setUsuarioEditando((p) => ({ ...p, nombre: e.target.value }))}
                />
              </label>
              <label className="emp-campo">
                <span>Correo</span>
                <input
                  type="email"
                  value={usuarioEditando.email}
                  onChange={(e) => setUsuarioEditando((p) => ({ ...p, email: e.target.value }))}
                />
              </label>
              <label className="emp-campo">
                <span>Rol</span>
                <select
                  value={usuarioEditando.rol}
                  onChange={(e) => setUsuarioEditando((p) => ({ ...p, rol: e.target.value }))}
                >
                  <option value="ASESOR">Asesor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </label>
              {errorEditarUsuario && <p className="emp-error-msg">{errorEditarUsuario}</p>}
              <div className="emp-modal__footer">
                <button type="button" className="emp-btn-secundario" onClick={cerrarEdicion}>
                  Cancelar
                </button>
                <button type="submit" className="emp-btn-primario" disabled={guardandoEdicion}>
                  {guardandoEdicion ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog confirmacion={confirmacion} onCancelar={() => setConfirmacion(null)} />
    </>
  )
}

// ============================================================
// HORARIOS — vista de solo lectura de todo el equipo
// ============================================================
function formatearHorario(dias) {
  const activos = dias.filter((d) => d.activo)
  if (activos.length === 0) return 'Sin días activos'

  const horas = new Set(activos.map((d) => `${d.hora_desde.slice(0, 5)}-${d.hora_hasta.slice(0, 5)}`))
  const diasTexto = activos.map((d) => DIAS_LABEL[d.dia_semana]).join(', ')

  return horas.size === 1
    ? `${diasTexto} · ${[...horas][0]}`
    : `${diasTexto} (horario variable por día)`
}

export function HorariosEmpresa() {
  const [equipo, setEquipo]     = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState(null)

  const cargar = useCallback(async () => {
    try {
      setCargando(true)
      setError(null)
      const data = await obtenerHorariosEquipo()
      setEquipo(data)
    } catch (e) {
      setError('No se pudo cargar el equipo.')
      console.error('[ConfiguracionEmpresa]', e)
    } finally {
      setCargando(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, mismo patrón que Prospectos.jsx (ver DT-018)
  useEffect(() => { cargar() }, [cargar])

  return (
    <div className="emp-seccion">
      <p className="emp-sub">
        Vista de solo lectura. Cada usuario edita su propio horario desde Mi Perfil.
      </p>

      {error ? (
        <p className="emp-sub">{error}</p>
      ) : cargando ? (
        <p className="emp-sub">Cargando…</p>
      ) : equipo.length === 0 ? (
        <p className="emp-sub">Sin usuarios registrados.</p>
      ) : (
        <ul className="emp-usuarios">
          {equipo.map((u) => (
            <li key={u.usuario_id} className="emp-usuarios__item">
              <div className="emp-usuarios__avatar">
                {u.nombre.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')}
              </div>
              <div className="emp-usuarios__info">
                <span className="emp-usuarios__nombre">{u.nombre}</span>
                <span className="emp-usuarios__email">{u.rol === 'ADMIN' ? 'Administrador' : 'Asesor'}</span>
              </div>
              <span className="emp-sin-horario">{formatearHorario(u.dias)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
