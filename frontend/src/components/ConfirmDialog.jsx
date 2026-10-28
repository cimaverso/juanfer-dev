// ============================================================
// src/components/ConfirmDialog.jsx
// Confirmación en UI — reemplaza window.confirm() del navegador
// en todo el admin. Uso:
//   const [confirmacion, setConfirmacion] = useState(null)
//   setConfirmacion({
//     mensaje: '¿Eliminar este registro?',
//     onConfirmar: async () => { setConfirmacion(null); ...acción... },
//   })
//   <ConfirmDialog confirmacion={confirmacion} onCancelar={() => setConfirmacion(null)} />
// ============================================================

import './ConfirmDialog.css'

export default function ConfirmDialog({ confirmacion, onCancelar }) {
  if (!confirmacion) return null

  const peligro = confirmacion.variante !== 'normal'

  return (
    <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && onCancelar()}>
      <div className="confirm-dialog" role="alertdialog" aria-modal="true">
        <div className={`confirm-dialog__icono ${peligro ? 'confirm-dialog__icono--peligro' : ''}`}>
          <i className={`bi ${peligro ? 'bi-exclamation-triangle-fill' : 'bi-send-fill'}`} />
        </div>
        <p className="confirm-dialog__mensaje">{confirmacion.mensaje}</p>
        <div className="confirm-dialog__acciones">
          <button className="confirm-dialog__cancelar" onClick={onCancelar}>
            Cancelar
          </button>
          <button
            className={`confirm-dialog__confirmar ${peligro ? 'confirm-dialog__confirmar--peligro' : ''}`}
            onClick={confirmacion.onConfirmar}
          >
            {confirmacion.textoConfirmar || (peligro ? 'Eliminar' : 'Confirmar')}
          </button>
        </div>
      </div>
    </div>
  )
}
