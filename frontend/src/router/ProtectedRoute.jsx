// ============================================================
// router/ProtectedRoute.jsx
// Guarda rutas por autenticación y por rol
// Uso: <ProtectedRoute />              → solo autenticado
//      <ProtectedRoute rolRequerido="ADMIN" /> → solo admins
// ============================================================

import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProtectedRoute({ rolRequerido }) {
  const { usuario, cargando } = useAuth()

  // Mientras restaura sesión desde localStorage no decide nada
  if (cargando) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: 'var(--color-fondo)',
      }}>
        <div className="spinner" />
      </div>
    )
  }

  // No autenticado → login
  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  // Rol insuficiente → dashboard (ve la app pero no esa sección)
  if (rolRequerido && usuario.rol !== rolRequerido) {
    return <Navigate to="/dashboard" replace />
  }

  // Todo OK → renderiza la ruta hija
  return <Outlet />
}