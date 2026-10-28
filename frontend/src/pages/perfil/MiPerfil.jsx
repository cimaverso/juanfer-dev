// ============================================================
// src/pages/perfil/MiPerfil.jsx
// Accesible para ADMIN y ASESOR (ruta /mi-perfil, sin rolRequerido).
// Pestañas:
//   - Información básica: datos de la tabla `usuario` (solo lectura,
//     vienen de AuthContext — mismo shape que GET /usuarios).
//   - Horario: franjas de disponibilidad por día de la semana,
//     propio y editable. Front-only por ahora (sin modelo en
//     backend/DB todavía, ver DEUDA): se guarda en localStorage por
//     usuario. Ver los horarios de TODO el equipo es cosa del ADMIN
//     y vive en Configuración → Empresa → Horarios
//     (pages/admin/ConfiguracionEmpresa.jsx), no aquí.
// ============================================================

import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import Toast from '../../components/Toast.jsx'
import './MiPerfil.css'

const TABS = [
  { id: 'info', label: 'Información básica', icono: 'bi-person-vcard' },
  { id: 'horario', label: 'Horario', icono: 'bi-calendar-week' },
]

const DIAS = [
  { id: 'lunes', label: 'Lunes' },
  { id: 'martes', label: 'Martes' },
  { id: 'miercoles', label: 'Miércoles' },
  { id: 'jueves', label: 'Jueves' },
  { id: 'viernes', label: 'Viernes' },
  { id: 'sabado', label: 'Sábado' },
  { id: 'domingo', label: 'Domingo' },
]

function horarioVacio() {
  return DIAS.reduce((acc, d) => ({
    ...acc,
    [d.id]: { activo: d.id !== 'sabado' && d.id !== 'domingo', desde: '08:00', hasta: '17:00' },
  }), {})
}

function cargarHorarioLocal(usuarioId) {
  try {
    const guardado = localStorage.getItem(`jf_horario_${usuarioId}`)
    return guardado ? JSON.parse(guardado) : horarioVacio()
  } catch {
    return horarioVacio()
  }
}

export default function MiPerfil() {
  const { usuario } = useAuth()
  const [tabActiva, setTabActiva] = useState('info')

  return (
    <div className="perfil page-enter">
      <div className="perfil-header">
        <h2 className="perfil-header__titulo">Mi perfil</h2>
        <p className="perfil-header__sub">Tu información y tu disponibilidad en el sistema.</p>
      </div>

      <div className="perfil-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`perfil-tabs__item ${tabActiva === t.id ? 'perfil-tabs__item--activo' : ''}`}
            onClick={() => setTabActiva(t.id)}
          >
            <i className={`bi ${t.icono}`} /> {t.label}
          </button>
        ))}
      </div>

      {tabActiva === 'info' ? (
        <InformacionBasica usuario={usuario} />
      ) : (
        <Horario usuario={usuario} />
      )}
    </div>
  )
}

// ============================================================
// INFORMACIÓN BÁSICA — solo lectura
// ============================================================
function InformacionBasica({ usuario }) {
  return (
    <div className="perfil-seccion">
      <div className="perfil-campo">
        <span className="perfil-campo__label">Nombre</span>
        <span className="perfil-campo__valor">{usuario?.nombre || '—'}</span>
      </div>
      <div className="perfil-campo">
        <span className="perfil-campo__label">Correo</span>
        <span className="perfil-campo__valor">{usuario?.email || '—'}</span>
      </div>
      <div className="perfil-campo">
        <span className="perfil-campo__label">Rol</span>
        <span className="perfil-campo__valor">{usuario?.rol === 'ADMIN' ? 'Administrador' : 'Asesor'}</span>
      </div>
      <div className="perfil-campo">
        <span className="perfil-campo__label">Iniciales</span>
        <span className="perfil-campo__valor">{usuario?.iniciales || '—'}</span>
      </div>
    </div>
  )
}

// ============================================================
// HORARIO — franjas por día de la semana (propio, editable)
// ============================================================
function Horario({ usuario }) {
  const [horario, setHorario] = useState(() => cargarHorarioLocal(usuario?.id))
  const [toast, setToast] = useState(null)

  function alternarDia(diaId) {
    setHorario((prev) => ({ ...prev, [diaId]: { ...prev[diaId], activo: !prev[diaId].activo } }))
  }

  function cambiarHora(diaId, campo, valor) {
    setHorario((prev) => ({ ...prev, [diaId]: { ...prev[diaId], [campo]: valor } }))
  }

  function guardar() {
    try {
      localStorage.setItem(`jf_horario_${usuario.id}`, JSON.stringify(horario))
      setToast({ tipo: 'exito', mensaje: 'Horario guardado en este dispositivo (pendiente de backend, ver DEUDA).' })
    } catch {
      setToast({ tipo: 'error', mensaje: 'No se pudo guardar el horario.' })
    }
  }

  return (
    <>
      <div className="perfil-seccion">
        <div className="perfil-horario">
          {DIAS.map((d) => (
            <div key={d.id} className={`perfil-horario__fila ${!horario[d.id].activo ? 'perfil-horario__fila--inactiva' : ''}`}>
              <button
                className={`perfil-horario__switch ${horario[d.id].activo ? 'perfil-horario__switch--on' : ''}`}
                onClick={() => alternarDia(d.id)}
                title={horario[d.id].activo ? 'Disponible' : 'No disponible'}
              >
                <span className="perfil-horario__switch-bola" />
              </button>
              <span className="perfil-horario__dia">{d.label}</span>
              <input
                type="time"
                className="perfil-horario__hora"
                value={horario[d.id].desde}
                disabled={!horario[d.id].activo}
                onChange={(e) => cambiarHora(d.id, 'desde', e.target.value)}
              />
              <span className="perfil-horario__separador">a</span>
              <input
                type="time"
                className="perfil-horario__hora"
                value={horario[d.id].hasta}
                disabled={!horario[d.id].activo}
                onChange={(e) => cambiarHora(d.id, 'hasta', e.target.value)}
              />
            </div>
          ))}
        </div>

        <button className="perfil-btn-primario" onClick={guardar}>
          <i className="bi bi-check-lg" /> Guardar horario
        </button>
      </div>

      <Toast toast={toast} onCerrar={() => setToast(null)} />
    </>
  )
}
