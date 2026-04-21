// ============================================================
// api/axios.js
// Instancia base de Axios — enchufe hacia FastAPI
// Para activar mocks: VITE_USE_MOCK=true en .env.local
// Para apuntar al backend: VITE_API_URL=http://localhost:8000
// ============================================================

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Interceptor de REQUEST ────────────────────────────────
// Agrega el token JWT a cada petición si existe en localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jf_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Interceptor de RESPONSE ───────────────────────────────
// Manejo centralizado de errores HTTP
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status

    if (status === 401) {
      // Token expirado o inválido — limpiar sesión y redirigir a login
      localStorage.removeItem('jf_token')
      localStorage.removeItem('jf_usuario')
      window.location.href = '/login'
    }

    if (status === 403) {
      // Sin permisos — no redirige, deja que el componente maneje el error
      console.warn('[JF] Acceso denegado:', error.response?.data?.detail)
    }

    if (status === 422) {
      // Error de validación de FastAPI — útil para debugging
      console.warn('[JF] Error de validación:', error.response?.data?.detail)
    }

    if (status >= 500) {
      console.error('[JF] Error de servidor:', error.response?.data)
    }

    return Promise.reject(error)
  }
)

export default api

// ── Flag de mocks ─────────────────────────────────────────
// Usado por cada servicio para decidir si llama a la API real
// o retorna datos ficticios.
// Cambiar a false cuando el backend esté listo.
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'