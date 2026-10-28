// ============================================================
// src/pages/admin/ConfiguracionEmpresa.jsx
// Grupo "Empresa" de Configuración (solo ADMIN):
//   - Datos de la empresa: formulario front-only, sin modelo en
//     backend/DB todavía (se guarda en localStorage). Ver DEUDA.
//   - Usuarios: lista real (GET /usuarios) con acción de
//     "Restablecer contraseña". La clave dinámica se genera en el
//     navegador y solo se muestra en pantalla — no hay endpoint de
//     backend que la aplique todavía (ver DEUDA). El bloqueo tras
//     3 intentos fallidos (15 min) es una feature de Login.jsx
//     pendiente, no se construye aquí.
//   - Horarios: vista de solo lectura de la disponibilidad de TODO
//     el equipo. Cada usuario edita el suyo en Mi Perfil → Horario
//     (pages/perfil/MiPerfil.jsx); aquí el admin solo mira. Front-only
//     (sin backend que guarde el horario de otros, ver DEUDA).
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { obtenerAsesores } from '../../api/catalogos.js'
import Toast from '../../components/Toast.jsx'
import './ConfiguracionEmpresa.css'

// ============================================================
// DATOS DE LA EMPRESA
// ============================================================
const EMPRESA_VACIA = { nombre: '', nit: '', direccion: '', telefono: '', correo: '' }

function cargarEmpresaLocal() {
  try {
    const guardado = localStorage.getItem('jf_empresa')
    return guardado ? JSON.parse(guardado) : EMPRESA_VACIA
  } catch {
    return EMPRESA_VACIA
  }
}

export function DatosEmpresa() {
  const [empresa, setEmpresa] = useState(() => cargarEmpresaLocal())
  const [toast, setToast]     = useState(null)

  function cambiar(campo, valor) {
    setEmpresa((prev) => ({ ...prev, [campo]: valor }))
  }

  function guardar(e) {
    e.preventDefault()
    try {
      localStorage.setItem('jf_empresa', JSON.stringify(empresa))
      setToast({ tipo: 'exito', mensaje: 'Guardado en este dispositivo (pendiente de backend, ver DEUDA).' })
    } catch {
      setToast({ tipo: 'error', mensaje: 'No se pudo guardar.' })
    }
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
          <button type="submit" className="emp-btn-primario">
            <i className="bi bi-check-lg" /> Guardar
          </button>
        </form>
      </div>
      <Toast toast={toast} onCerrar={() => setToast(null)} />
    </>
  )
}

// ============================================================
// USUARIOS — lista + restablecer contraseña (clave dinámica)
// ============================================================
function generarClaveDinamica() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let clave = ''
  for (let i = 0; i < 10; i++) clave += alfabeto[Math.floor(Math.random() * alfabeto.length)]
  return clave
}

export function UsuariosEmpresa() {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState(null)
  const [claveGenerada, setClaveGenerada] = useState(null) // { usuario, clave }

  const cargar = useCallback(async () => {
    try {
      setCargando(true)
      setError(null)
      const data = await obtenerAsesores()
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

  function restablecerClave(usuario) {
    setClaveGenerada({ usuario, clave: generarClaveDinamica() })
  }

  return (
    <>
      <div className="emp-seccion">
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
                <button className="emp-btn-secundario" onClick={() => restablecerClave(u)}>
                  <i className="bi bi-key" /> Restablecer contraseña
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {claveGenerada && (
        <div className="emp-overlay" onClick={(e) => e.target === e.currentTarget && setClaveGenerada(null)}>
          <div className="emp-modal" role="dialog" aria-modal="true">
            <div className="emp-modal__header">
              <span><i className="bi bi-key" /> Clave temporal generada</span>
              <button className="emp-btn-icon" onClick={() => setClaveGenerada(null)} aria-label="Cerrar">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="emp-modal__body">
              <p className="emp-sub">
                Entrégale esta clave a <strong>{claveGenerada.usuario.nombre}</strong> por un canal seguro. Al ingresar con ella deberá definir su nueva contraseña.
              </p>
              <div className="emp-clave">{claveGenerada.clave}</div>
              <p className="emp-aviso">
                <i className="bi bi-exclamation-triangle" /> Vista de frontend por ahora: esta clave no se aplica todavía en el backend (pendiente, ver DEUDA).
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ============================================================
// HORARIOS — vista de solo lectura de todo el equipo
// ============================================================
export function HorariosEmpresa() {
  const [equipo, setEquipo]     = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState(null)

  const cargar = useCallback(async () => {
    try {
      setCargando(true)
      setError(null)
      const data = await obtenerAsesores()
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
            <li key={u.id} className="emp-usuarios__item">
              <div className="emp-usuarios__avatar">{u.iniciales}</div>
              <div className="emp-usuarios__info">
                <span className="emp-usuarios__nombre">{u.nombre}</span>
                <span className="emp-usuarios__email">{u.rol === 'ADMIN' ? 'Administrador' : 'Asesor'}</span>
              </div>
              <span className="emp-sin-horario">Sin horario configurado</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
