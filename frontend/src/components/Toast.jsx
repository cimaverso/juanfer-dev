// ============================================================
// src/components/Toast.jsx
// Notificación flotante para errores/éxitos — reemplaza el
// alert() del navegador en todo el admin (ver docs/DEUDA.md:
// ningún error de UI debe mostrarse con alert nativo).
// Uso: const [toast, setToast] = useState(null)
//      setToast({ tipo: 'error', mensaje: '...' })
//      <Toast toast={toast} onCerrar={() => setToast(null)} />
// ============================================================

import { useEffect } from 'react'
import './Toast.css'

export default function Toast({ toast, onCerrar }) {
  useEffect(() => {
    if (!toast) return
    const temporizador = setTimeout(onCerrar, 4000)
    return () => clearTimeout(temporizador)
  }, [toast, onCerrar])

  if (!toast) return null

  const esError = toast.tipo === 'error'

  return (
    <div className={`toast ${esError ? 'toast--error' : 'toast--exito'}`} role="status">
      <i className={`bi ${esError ? 'bi-exclamation-circle-fill' : 'bi-check-circle-fill'}`} />
      <span>{toast.mensaje}</span>
      <button className="toast__cerrar" onClick={onCerrar} aria-label="Cerrar notificación">
        <i className="bi bi-x" />
      </button>
    </div>
  )
}
