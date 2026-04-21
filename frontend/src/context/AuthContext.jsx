// ============================================================
// context/AuthContext.jsx
// Estado global de autenticación: usuario, rol, token
// Provee: usuario, rol, login(), logout(), cargando
// ============================================================

import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

// ── Datos de usuario mock ─────────────────────────────────
// Se reemplaza por llamada real a FastAPI en login()
// cuando el backend esté listo
const MOCK_USUARIOS = {
  'dani@juanfer.com': {
    id: 1,
    nombre: 'Dani Rodríguez',
    email: 'dani@juanfer.com',
    rol: 'ADMIN',
    iniciales: 'DR',
  },
  'juan@juanfer.com': {
    id: 2,
    nombre: 'Juan Fernández',
    email: 'juan@juanfer.com',
    rol: 'ADMIN',
    iniciales: 'JF',
  },
  'gina@juanfer.com': {
    id: 3,
    nombre: 'Gina López',
    email: 'gina@juanfer.com',
    rol: 'ASESOR',
    iniciales: 'GL',
  },
  'diego@juanfer.com': {
    id: 4,
    nombre: 'Diego Martínez',
    email: 'diego@juanfer.com',
    rol: 'ASESOR',
    iniciales: 'DM',
  },
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  // Al montar: restaurar sesión desde localStorage si existe
  useEffect(() => {
    try {
      const usuarioGuardado = localStorage.getItem('jf_usuario')
      const token = localStorage.getItem('jf_token')
      if (usuarioGuardado && token) {
        setUsuario(JSON.parse(usuarioGuardado))
      }
    } catch {
      localStorage.removeItem('jf_usuario')
      localStorage.removeItem('jf_token')
    } finally {
      setCargando(false)
    }
  }, [])

  // ── login() ───────────────────────────────────────────
  // Mock activo: valida contra MOCK_USUARIOS
  // Backend listo: POST /api/v1/auth/login y recibe JWT
  const login = async (email, password) => {
    const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

    if (USE_MOCK) {
      // Simula latencia de red
      await new Promise((r) => setTimeout(r, 600))

      const usuarioMock = MOCK_USUARIOS[email.toLowerCase()]
      if (!usuarioMock || password !== '123456') {
        throw new Error('Credenciales incorrectas')
      }

      const tokenMock = `mock-token-${usuarioMock.id}-${Date.now()}`
      localStorage.setItem('jf_token', tokenMock)
      localStorage.setItem('jf_usuario', JSON.stringify(usuarioMock))
      setUsuario(usuarioMock)
      return usuarioMock
    }

    // ── Backend real ──────────────────────────────────
    const { default: api } = await import('../api/axios.js')
    const { data } = await api.post('/auth/login', { email, password })

    localStorage.setItem('jf_token', data.access_token)
    localStorage.setItem('jf_usuario', JSON.stringify(data.usuario))
    setUsuario(data.usuario)
    return data.usuario
  }

  // ── logout() ──────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('jf_token')
    localStorage.removeItem('jf_usuario')
    setUsuario(null)
  }

  // ── Helpers de rol ────────────────────────────────────
  const esAdmin = usuario?.rol === 'ADMIN'
  const esAsesor = usuario?.rol === 'ASESOR'

  const value = {
    usuario,
    cargando,
    login,
    logout,
    esAdmin,
    esAsesor,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook de consumo ───────────────────────────────────────
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return context
}