// ============================================================
// pages/auth/Login.jsx
// Pantalla de inicio de sesión — identidad Juanfer Seguros
// ============================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import './Login.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) {
      setError('Ingresa tu correo y contraseña.')
      return
    }

    setCargando(true)
    setError('')

    try {
      const usuario = await login(form.email, form.password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-shell">

      {/* ── Panel izquierdo — marca ──────────────── */}
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
            <p className="login-marca__descripcion">
              Sistema de gestión interno para el equipo de asesores de Juanfer Seguros.
            </p>
          </div>

          <div className="login-marca__valores">
            <div className="login-marca__valor">
              <i className="bi bi-shield-check" />
              <span>Protección con propósito</span>
            </div>
            <div className="login-marca__valor">
              <i className="bi bi-people" />
              <span>Cercana y humana</span>
            </div>
            <div className="login-marca__valor">
              <i className="bi bi-graph-up-arrow" />
              <span>Resultados con sentido</span>
            </div>
          </div>
        </div>

        {/* Patrón decorativo */}
        <div className="login-marca__patron" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="login-marca__patron-item">JF</span>
          ))}
        </div>
      </div>

      {/* ── Panel derecho — formulario ───────────── */}
      <div className="login-form-panel">
        <div className="login-form-wrap">

          <div className="login-form__header">
            <h1 className="login-form__titulo">Bienvenido</h1>
            <p className="login-form__subtitulo">
              Inicia sesión para continuar
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>

            {/* Email */}
            <div className="login-form__campo">
              <label className="login-form__label" htmlFor="email">
                Correo electrónico
              </label>
              <div className="login-form__input-wrap">
                <i className="bi bi-envelope login-form__input-icono" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tucorreo@juanfer.com"
                  value={form.email}
                  onChange={handleChange}
                  className={error ? 'input-error' : ''}
                  disabled={cargando}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="login-form__campo">
              <label className="login-form__label" htmlFor="password">
                Contraseña
              </label>
              <div className="login-form__input-wrap">
                <i className="bi bi-lock login-form__input-icono" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  className={error ? 'input-error' : ''}
                  disabled={cargando}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="login-form__error">
                <i className="bi bi-exclamation-circle" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="login-form__btn"
              disabled={cargando}
            >
              {cargando ? (
                <>
                  <div className="spinner" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <span>Ingresar</span>
                  <i className="bi bi-arrow-right" />
                </>
              )}
            </button>

          </form>

          {/* Hint de credenciales mock */}
          {import.meta.env.VITE_USE_MOCK === 'true' && (
            <div className="login-form__hint">
              <i className="bi bi-info-circle" />
              <div>
                <strong>Modo desarrollo</strong>
                <p>dani@juanfer.com · juan@juanfer.com · gina@juanfer.com</p>
                <p>Contraseña: <code>123456</code></p>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  )
}