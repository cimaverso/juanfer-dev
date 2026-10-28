// ============================================================
// pages/auth/RestablecerPassword.jsx
// Ruta pública /restablecer-password (sin login).
// Flujo de 2 pasos tras recibir un código del ADMIN (DT-023b):
//   1. Correo + código -> POST /auth/validar-codigo-reset
//   2. Nueva contraseña -> POST /auth/reset-password
// Reutiliza el shell visual de Login.css (misma familia de pantallas).
// ============================================================

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { validarCodigoReset, resetPassword } from '../../api/auth.js'
import '../auth/Login.css'
import './RestablecerPassword.css'

export default function RestablecerPassword() {
  const navigate = useNavigate()
  const [paso, setPaso] = useState('codigo') // 'codigo' | 'password' | 'listo'
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function handleValidarCodigo(e) {
    e.preventDefault()
    if (!email || !codigo) {
      setError('Ingresa tu correo y el código que te dio el administrador.')
      return
    }

    setCargando(true)
    setError('')
    try {
      await validarCodigoReset(email, codigo)
      setPaso('password')
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo validar el código.')
    } finally {
      setCargando(false)
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    if (!nuevaPassword || nuevaPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (nuevaPassword !== confirmarPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setCargando(true)
    setError('')
    try {
      await resetPassword(email, codigo, nuevaPassword)
      setPaso('listo')
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo actualizar la contraseña.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-shell">
      <div className="login-marca">
        <div className="login-marca__contenido">
          <div className="login-marca__logo">
            <span className="login-marca__sigla">JF</span>
            <div className="login-marca__texto">
              <span className="login-marca__nombre">JUANFER</span>
              <span className="login-marca__sub">SEGUROS</span>
            </div>
          </div>
          <div className="login-marca__copy">
            <h2 className="login-marca__titular">
              Más que seguros,<br />tranquilidad.
            </h2>
          </div>
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-form-wrap">

          {paso === 'codigo' && (
            <>
              <div className="login-form__header">
                <h1 className="login-form__titulo">Restablecer contraseña</h1>
                <p className="login-form__subtitulo">
                  Ingresa tu correo y el código que te entregó el administrador.
                </p>
              </div>

              <form className="login-form" onSubmit={handleValidarCodigo} noValidate>
                <div className="login-form__campo">
                  <label className="login-form__label" htmlFor="email">Correo electrónico</label>
                  <div className="login-form__input-wrap">
                    <i className="bi bi-envelope login-form__input-icono" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                      disabled={cargando}
                    />
                  </div>
                </div>

                <div className="login-form__campo">
                  <label className="login-form__label" htmlFor="codigo">Código</label>
                  <div className="login-form__input-wrap">
                    <i className="bi bi-key login-form__input-icono" />
                    <input
                      id="codigo"
                      type="text"
                      value={codigo}
                      onChange={(e) => { setCodigo(e.target.value); if (error) setError('') }}
                      disabled={cargando}
                    />
                  </div>
                </div>

                {error && (
                  <div className="login-form__error">
                    <i className="bi bi-exclamation-circle" />
                    <span>{error}</span>
                  </div>
                )}

                <button type="submit" className="login-form__btn" disabled={cargando}>
                  {cargando ? <><div className="spinner" /><span>Validando...</span></> : <span>Continuar</span>}
                </button>
              </form>
            </>
          )}

          {paso === 'password' && (
            <>
              <div className="login-form__header">
                <h1 className="login-form__titulo">Define tu nueva contraseña</h1>
                <p className="login-form__subtitulo">Código verificado. Elige una contraseña nueva.</p>
              </div>

              <form className="login-form" onSubmit={handleReset} noValidate>
                <div className="login-form__campo">
                  <label className="login-form__label" htmlFor="nueva">Nueva contraseña</label>
                  <div className="login-form__input-wrap">
                    <i className="bi bi-lock login-form__input-icono" />
                    <input
                      id="nueva"
                      type="password"
                      autoComplete="new-password"
                      value={nuevaPassword}
                      onChange={(e) => { setNuevaPassword(e.target.value); if (error) setError('') }}
                      disabled={cargando}
                    />
                  </div>
                </div>

                <div className="login-form__campo">
                  <label className="login-form__label" htmlFor="confirmar">Confirmar contraseña</label>
                  <div className="login-form__input-wrap">
                    <i className="bi bi-lock login-form__input-icono" />
                    <input
                      id="confirmar"
                      type="password"
                      autoComplete="new-password"
                      value={confirmarPassword}
                      onChange={(e) => { setConfirmarPassword(e.target.value); if (error) setError('') }}
                      disabled={cargando}
                    />
                  </div>
                </div>

                {error && (
                  <div className="login-form__error">
                    <i className="bi bi-exclamation-circle" />
                    <span>{error}</span>
                  </div>
                )}

                <button type="submit" className="login-form__btn" disabled={cargando}>
                  {cargando ? <><div className="spinner" /><span>Guardando...</span></> : <span>Guardar contraseña</span>}
                </button>
              </form>
            </>
          )}

          {paso === 'listo' && (
            <div className="restablecer-listo">
              <i className="bi bi-check-circle restablecer-listo__icono" />
              <h1 className="login-form__titulo">Contraseña actualizada</h1>
              <p className="login-form__subtitulo">Ya puedes iniciar sesión con tu nueva contraseña.</p>
              <button type="button" className="login-form__btn" onClick={() => navigate('/login', { replace: true })}>
                <span>Ir a iniciar sesión</span>
              </button>
            </div>
          )}

          {paso !== 'listo' && (
            <Link to="/login" className="restablecer-volver">
              <i className="bi bi-arrow-left" /> Volver a iniciar sesión
            </Link>
          )}

        </div>
      </div>
    </div>
  )
}
