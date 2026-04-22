// ============================================================
// components/layout/Sidebar.jsx
// Sidebar colapsable con iconos Bootstrap Icons
// Expandido: icono + texto | Colapsado: solo icono + tooltip
// ============================================================

import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import './Sidebar.css'

// ── Ítems de navegación ───────────────────────────────────
const NAV_ITEMS = [
  {
    ruta: '/dashboard',
    icono: 'bi-speedometer2',
    label: 'Dashboard',
    roles: ['ADMIN', 'ASESOR'],
  },
  {
    ruta: '/produccion',
    icono: 'bi-file-earmark-check',
    label: 'Producción',
    roles: ['ADMIN', 'ASESOR'],
  },
  {
    ruta: '/cotizaciones',
    icono: 'bi-calculator',
    label: 'Cotizaciones',
    roles: ['ADMIN', 'ASESOR'],
    proximamente: true,
  },
  {
    ruta: '/prospectos',
    icono: 'bi-person-lines-fill',
    label: 'Prospectos',
    roles: ['ADMIN', 'ASESOR'],
    proximamente: true,
  },
  {
    ruta: '/cancelaciones',
    icono: 'bi-x-circle',
    label: 'Cancelaciones',
    roles: ['ADMIN', 'ASESOR'],
    proximamente: true,
  },
  {
    ruta: '/plantillas',
    icono: 'bi-chat-left-text',
    label: 'Plantillas',
    roles: ['ADMIN', 'ASESOR'],
    proximamente: true,
  },
]

const NAV_ADMIN = [
  {
    ruta: '/admin',
    icono: 'bi-gear',
    label: 'Administración',
    roles: ['ADMIN'],
    proximamente: true,
  },
]

export default function Sidebar({ colapsado, onToggle }) {
  const { usuario, esAdmin, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const itemsVisibles = NAV_ITEMS.filter((item) =>
    item.roles.includes(usuario?.rol)
  )

  const adminVisible = NAV_ADMIN.filter((item) =>
    item.roles.includes(usuario?.rol)
  )

  return (
    <aside className={`sidebar ${colapsado ? 'sidebar--colapsado' : ''}`}>

      {/* ── Logo ────────────────────────────────────── */}
      <div className="sidebar__logo">
        {colapsado ? (
          <span className="sidebar__logo-sigla">JF</span>
        ) : (
          <div className="sidebar__logo-full">
            <span className="sidebar__logo-sigla">JF</span>
            <div className="sidebar__logo-texto">
              <span className="sidebar__logo-nombre">JUANFER</span>
              <span className="sidebar__logo-sub">SEGUROS</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Botón colapsar ──────────────────────────── */}
      <button
        className="sidebar__toggle"
        onClick={onToggle}
        title={colapsado ? 'Expandir menú' : 'Colapsar menú'}
      >
        <i className={`bi ${colapsado ? 'bi-chevron-right' : 'bi-chevron-left'}`} />
      </button>

      {/* ── Navegación principal ────────────────────── */}
      <nav className="sidebar__nav">
        {!colapsado && (
          <span className="sidebar__seccion-label">MENÚ</span>
        )}

        {itemsVisibles.map((item) => (
          <NavItem
            key={item.ruta}
            item={item}
            colapsado={colapsado}
          />
        ))}

        {/* Separador admin */}
        {esAdmin && adminVisible.length > 0 && (
          <>
            <div className="sidebar__divider" />
            {!colapsado && (
              <span className="sidebar__seccion-label">CONFIGURACIÓN</span>
            )}
            {adminVisible.map((item) => (
              <NavItem
                key={item.ruta}
                item={item}
                colapsado={colapsado}
              />
            ))}
          </>
        )}
      </nav>

      {/* ── Usuario + logout ────────────────────────── */}
      <div className="sidebar__footer">
        <div className="sidebar__divider" />
        <div className="sidebar__usuario">
          <div className="sidebar__avatar">
            {usuario?.iniciales || '??'}
          </div>
          {!colapsado && (
            <div className="sidebar__usuario-info">
              <span className="sidebar__usuario-nombre">
                {usuario?.nombre}
              </span>
              <span className="sidebar__usuario-rol">
                {usuario?.rol === 'ADMIN' ? 'Administrador' : 'Asesor'}
              </span>
            </div>
          )}
        </div>
        <button
          className="sidebar__logout"
          onClick={handleLogout}
          title="Cerrar sesión"
        >
          <i className="bi bi-box-arrow-left" />
          {!colapsado && <span>Salir</span>}
        </button>
      </div>

    </aside>
  )
}

// ── Componente NavItem ────────────────────────────────────
function NavItem({ item, colapsado }) {
  if (item.proximamente) {
    return (
      <div
        className={`sidebar__item sidebar__item--disabled ${colapsado ? 'sidebar__item--colapsado' : ''}`}
        title={colapsado ? item.label : ''}
      >
        <i className={`bi ${item.icono} sidebar__item-icono`} />
        {!colapsado && (
          <>
            <span className="sidebar__item-label">{item.label}</span>
            <span className="sidebar__item-badge">Pronto</span>
          </>
        )}
      </div>
    )
  }

  return (
    <NavLink
      to={item.ruta}
      className={({ isActive }) =>
        `sidebar__item ${isActive ? 'sidebar__item--activo' : ''} ${colapsado ? 'sidebar__item--colapsado' : ''}`
      }
      title={colapsado ? item.label : ''}
    >
      <i className={`bi ${item.icono} sidebar__item-icono`} />
      {!colapsado && (
        <span className="sidebar__item-label">{item.label}</span>
      )}
    </NavLink>
  )
}