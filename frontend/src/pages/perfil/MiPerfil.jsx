// ============================================================
// src/pages/perfil/MiPerfil.jsx
// Accesible para ADMIN y ASESOR (ruta /mi-perfil, sin rolRequerido).
// Pestañas:
//   - Información básica: datos de la tabla `usuario` (solo lectura,
//     vienen de AuthContext — mismo shape que GET /usuarios).
//   - Horario: franjas de disponibilidad por día de la semana,
//     propio y editable. Backend real (DT-022 pagada):
//     GET/PUT /mi-horario. Ver los horarios de TODO el equipo es
//     cosa del ADMIN y vive en Configuración → Empresa → Horarios
//     (pages/admin/ConfiguracionEmpresa.jsx), no aquí.
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import Toast from '../../components/Toast.jsx'
import { obtenerMiHorario, guardarMiHorario } from '../../api/horarios.js'
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

function diasApiAObjeto(dias) {
  return dias.reduce((acc, d) => ({
    ...acc,
    [d.dia_semana]: { activo: d.activo, desde: d.hora_desde.slice(0, 5), hasta: d.hora_hasta.slice(0, 5) },
  }), {})
}

function objetoADiasApi(horario) {
  return DIAS.map((d) => ({
    dia_semana: d.id,
    activo: horario[d.id].activo,
    hora_desde: `${horario[d.id].desde}:00`,
    hora_hasta: `${horario[d.id].hasta}:00`,
  }))
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
        <Horario />
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
function Horario() {
  const [horario, setHorario] = useState(horarioVacio)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [toast, setToast] = useState(null)

  const cargar = useCallback(async () => {
    try {
      setCargando(true)
      const dias = await obtenerMiHorario()
      setHorario(diasApiAObjeto(dias))
    } catch {
      setToast({ tipo: 'error', mensaje: 'No se pudo cargar tu horario.' })
    } finally {
      setCargando(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, mismo patrón que Prospectos.jsx (ver DT-018)
  useEffect(() => { cargar() }, [cargar])

  function alternarDia(diaId) {
    setHorario((prev) => ({ ...prev, [diaId]: { ...prev[diaId], activo: !prev[diaId].activo } }))
  }

  function cambiarHora(diaId, campo, valor) {
    setHorario((prev) => ({ ...prev, [diaId]: { ...prev[diaId], [campo]: valor } }))
  }

  async function guardar() {
    try {
      setGuardando(true)
      const dias = await guardarMiHorario(objetoADiasApi(horario))
      setHorario(diasApiAObjeto(dias))
      setToast({ tipo: 'exito', mensaje: 'Horario guardado.' })
    } catch {
      setToast({ tipo: 'error', mensaje: 'No se pudo guardar el horario.' })
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return <div className="perfil-seccion"><p>Cargando horario…</p></div>
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

        <button className="perfil-btn-primario" onClick={guardar} disabled={guardando}>
          <i className="bi bi-check-lg" /> {guardando ? 'Guardando…' : 'Guardar horario'}
        </button>
      </div>

      <Toast toast={toast} onCerrar={() => setToast(null)} />
    </>
  )
}
