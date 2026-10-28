// ============================================================
// api/auth.js
// Flujo de restablecimiento de contraseña por código de un solo
// uso (DT-023b, backend real desde el día 1). El login en sí vive
// en context/AuthContext.jsx, no aquí.
// Endpoints reales (backend/app/routers/auth.py):
//   POST /auth/validar-codigo-reset
//   POST /auth/reset-password
// ============================================================

import api from './axios.js'

export async function validarCodigoReset(email, codigo) {
  const { data } = await api.post('/auth/validar-codigo-reset', { email, codigo })
  return data
}

export async function resetPassword(email, codigo, nuevaPassword) {
  const { data } = await api.post('/auth/reset-password', { email, codigo, nueva_password: nuevaPassword })
  return data
}
