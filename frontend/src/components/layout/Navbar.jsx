// ============================================================
// components/layout/Navbar.jsx
// Barra superior: título, alertas, toggle de tema, usuario
// ============================================================

import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import './Navbar.css'

// Mapa de rutas a títulos legibles
const TITULOS = {
  '/dashboard':     'Dashboard',
  '/produccion':    'Producción',
  '/cotizaciones':  'Cotizaciones',
  '/prospectos':    'Prospectos',
  '/cancelaciones': 'Cancelaciones',
  '/plantillas':    'Plantillas',
  '/admin':         'Administración',
}

function getTitulo(pathname) {
  if (TITULOS[pathname]) return TITULOS[pathname]
  const base = '/' + pathname.split('/')[1]
  return TITULOS[base] || 'Juanfer Seguros'
}

function getSubtitulo(pathname) {
  if (pathname.includes('/nueva')) return 'Nueva póliza'
  if (pathname.includes('/editar')) return 'Editar póliza'
  if (pathname.match(/\/produccion\/\d+$/)) return 'Detalle de póliza'
  return null
}

export default function Navbar({ onToggleSidebar, colapsado }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { usuario, logout } = useAuth()
  const { esDark, toggleTema } = useTheme()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickFuera(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAbierto(false)
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const titulo    = getTitulo(pathname)
  const subtitulo = getSubtitulo(pathname)

  // Alertas activas — mock inicial, se conecta a AlertasContext después
  const alertasActivas = 3

  return (
    <header className="navbar">

      {/* ── Izquierda: toggle mobile + título ─────── */}
      <div className="navbar__izquierda">
        <button
          className="navbar__menu-btn"
          onClick={onToggleSidebar}
          title={colapsado ? 'Expandir menú' : 'Colapsar menú'}
        >
          <i className="bi bi-list" />
        </button>
        <div className="navbar__titulo-wrap">
          <h1 className="navbar__titulo">{titulo}</h1>
          {subtitulo && (
            <span className="navbar__subtitulo">
              <i className="bi bi-chevron-right" />
              {subtitulo}
            </span>
          )}
        </div>
      </div>

      {/* ── Derecha: alertas + tema + usuario ────── */}
      <div className="navbar__derecha">

        {/* Alertas */}
        <button className="navbar__icon-btn" title="Alertas pendientes">
          <i className="bi bi-bell" />
          {alertasActivas > 0 && (
            <span className="navbar__badge">{alertasActivas}</span>
          )}
        </button>

        {/* ── Toggle tema claro/oscuro ──────────── */}
        <button
          className="navbar__icon-btn navbar__theme-toggle"
          onClick={toggleTema}
          title={esDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          aria-label={esDark ? 'Activar modo claro' : 'Activar modo oscuro'}
        >
          {/* Sol en dark (para volver a claro), Luna en light (para ir a dark) */}
          <i className={`bi ${esDark ? 'bi-sun' : 'bi-moon'}`} />
        </button>

        {/* Separador */}
        <div className="navbar__sep" />

        {/* Usuario compacto + menú */}
        <div className="navbar__usuario-wrap" ref={menuRef}>
          <button className="navbar__usuario" onClick={() => setMenuAbierto((v) => !v)}>
            <div className="navbar__avatar">
              {usuario?.iniciales || '??'}
            </div>
            <div className="navbar__usuario-info">
              <span className="navbar__usuario-nombre">{usuario?.nombre}</span>
              <span className="navbar__usuario-rol">
                {usuario?.rol === 'ADMIN' ? 'Administrador' : 'Asesor'}
              </span>
            </div>
            <i className={`bi bi-chevron-down navbar__usuario-flecha ${menuAbierto ? 'navbar__usuario-flecha--abierta' : ''}`} />
          </button>

          {menuAbierto && (
            <div className="navbar__menu">
              <button
                className="navbar__menu-item"
                onClick={() => { setMenuAbierto(false); navigate('/mi-perfil') }}
              >
                <i className="bi bi-person-circle" /> Mi perfil
              </button>
              <div className="navbar__menu-divider" />
              <button
                className="navbar__menu-item navbar__menu-item--danger"
                onClick={handleLogout}
              >
                <i className="bi bi-box-arrow-left" /> Cerrar sesión
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  )
}