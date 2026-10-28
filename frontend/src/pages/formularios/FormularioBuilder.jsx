// ============================================================
// src/pages/formularios/FormularioBuilder.jsx
// Builder de un formulario, estilo Microsoft Forms: cada
// pregunta es una tarjeta siempre editable (sin "formulario
// dentro del formulario" que haya que abrir/guardar/cerrar).
// Los cambios se guardan solos al salir del campo (igual que el
// título del formulario) o al instante en toggles/selects.
// Ruta: /admin/formularios/:id/editar
// Datos: api/formularios.js + api/catalogos.js (tipos de pregunta)
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  obtenerFormulario,
  actualizarFormulario,
  listarGrupos,
  crearGrupo,
  actualizarGrupo,
  eliminarGrupo,
  listarPreguntas,
  crearPregunta,
  actualizarPregunta,
  eliminarPregunta,
  publicarFormulario,
} from '../../api/formularios.js'
import { listarValoresCatalogo, obtenerTiposDocumento } from '../../api/catalogos.js'
import Toast from '../../components/Toast.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import './Formularios.css'
import './FormularioBuilder.css'

// Campos fijos de Cliente a los que una pregunta suelta puede mapearse
// (ver docs/modulos/formularios.md — regla de negocio D-009). Cada uno
// trae el tipo_codigo correcto para su columna real en la DB: al
// vincular, el tipo de la pregunta se fuerza a este valor y el
// selector de tipo se bloquea mientras siga vinculada, para que un
// admin no pueda dejar "Nombre" como tipo "Número" (ver incidente
// reportado: el error solo se notaba al enviar la respuesta pública).
const CAMPOS_CLIENTE = [
  { value: 'numero_documento', label: 'Número de documento', tipoForzado: 'texto' },
  { value: 'tipo_documento', label: 'Tipo de documento', tipoForzado: 'opcion' },
  { value: 'nombre_completo', label: 'Nombre completo', tipoForzado: 'texto' },
  { value: 'celular', label: 'Celular', tipoForzado: 'telefono' },
  { value: 'correo', label: 'Correo', tipoForzado: 'email' },
  { value: 'ocupacion', label: 'Ocupación', tipoForzado: 'texto' },
  { value: 'ciudad', label: 'Ciudad', tipoForzado: 'texto' },
]

// Icono por tipo de pregunta — cae a un icono genérico si el admin
// agrega un tipo nuevo al catálogo que no está en este mapa.
const ICONO_TIPO = {
  texto: 'bi-text-left',
  numero: 'bi-123',
  email: 'bi-envelope',
  telefono: 'bi-telephone',
  fecha: 'bi-calendar-event',
  opcion: 'bi-ui-radios',
  nps: 'bi-speedometer2',
  seccion: 'bi-distribute-vertical',
  calificacion: 'bi-star',
}

function iconoDe(codigo) {
  return ICONO_TIPO[codigo] || 'bi-input-cursor-text'
}

// Mismo valor reservado que BranchingCodigos.FIN en el backend
// (app/models/formularios/constantes.py) — salto explícito al final
// del formulario, sin apuntar a un paso real.
const BRANCHING_FIN = '__fin__'



// Códigos internos cortos y únicos — el admin no necesita verlos ni
// escribirlos; solo existen porque el backend los usa como clave
// estable (branching, mapea_a, respuestas). Editables en "Más opciones"
// para quien sí los necesite.
function generarCodigo(prefijo) {
  return `${prefijo}_${Date.now().toString(36)}${Math.floor(Math.random() * 36).toString(36)}`
}

function urlPublica(token) {
  return `${window.location.origin}/f/${token}`
}

export default function FormularioBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [formulario, setFormulario] = useState(null)
  const [cargando, setCargando]     = useState(true)
  const [error, setError]           = useState(null)

  const [titulo, setTitulo]         = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [copiado, setCopiado]       = useState(false)
  const [publicando, setPublicando] = useState(false)

  const [grupos, setGrupos]         = useState([])
  const [preguntas, setPreguntas]   = useState([])
  const [tiposPregunta, setTiposPregunta] = useState([])
  const [tiposDocumento, setTiposDocumento] = useState([])
  const [creandoPregunta, setCreandoPregunta] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirmacion, setConfirmacion] = useState(null)

  // "Pasos" posibles como destino de un salto condicional: preguntas
  // sueltas (cada una es su propia pantalla en la vista pública) y
  // grupos repetibles (el bloque completo es una pantalla).
  const pasos = useMemo(() => [
    ...preguntas.filter((p) => !p.grupo_id).map((p) => ({ codigo: p.codigo, label: p.titulo || 'Pregunta sin título' })),
    ...grupos.map((g) => ({ codigo: g.codigo, label: `Grupo: ${g.titulo_template}` })),
  ], [preguntas, grupos])

  const cargarTodo = useCallback(async () => {
    try {
      setCargando(true)
      setError(null)
      const [f, g, p, t, td] = await Promise.all([
        obtenerFormulario(id),
        listarGrupos(id),
        listarPreguntas(id),
        listarValoresCatalogo('formulario_pregunta_tipo'),
        obtenerTiposDocumento(),
      ])
      setFormulario(f)
      setTitulo(f.titulo)
      setDescripcion(f.descripcion || '')
      setGrupos(g.sort((a, b) => a.orden - b.orden))
      setPreguntas(p.sort((a, b) => a.orden - b.orden))
      setTiposPregunta(t)
      setTiposDocumento(td)
    } catch (e) {
      setError('No se pudo cargar el formulario.')
      console.error('[FormularioBuilder]', e)
    } finally {
      setCargando(false)
    }
  }, [id])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, mismo patrón que Prospectos.jsx (ver DT-018)
  useEffect(() => { cargarTodo() }, [cargarTodo])

  // ── Cabecera ───────────────────────────────────────────────
  async function guardarHeader() {
    if (!titulo.trim()) return
    try {
      const actualizado = await actualizarFormulario(id, {
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
      })
      setFormulario(actualizado)
    } catch (err) {
      setToast({ tipo: 'error', mensaje: err.response?.data?.detail || 'No se pudo guardar.' })
    }
  }

  function handlePublicar() {
    setConfirmacion({
      mensaje: '¿Publicar este formulario? Quedará disponible en su URL pública con la estructura actual.',
      textoConfirmar: 'Publicar',
      variante: 'normal',
      onConfirmar: async () => {
        setConfirmacion(null)
        try {
          setPublicando(true)
          await publicarFormulario(id)
          const actualizado = await obtenerFormulario(id)
          setFormulario(actualizado)
        } catch (err) {
          setToast({ tipo: 'error', mensaje: err.response?.data?.detail || 'No se pudo publicar.' })
        } finally {
          setPublicando(false)
        }
      },
    })
  }

  function copiarUrl() {
    navigator.clipboard.writeText(urlPublica(formulario.token_publico)).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    })
  }

  // ── Grupos ───────────────────────────────────────────────
  async function handleNuevoGrupo() {
    try {
      const creado = await crearGrupo(id, {
        codigo: generarCodigo('grupo'),
        titulo_template: 'Grupo repetible',
        minimo_repeticiones: 0,
        maximo_repeticiones: null,
        entidad_destino: null,
      })
      setGrupos((prev) => [...prev, creado])
    } catch (err) {
      setToast({ tipo: 'error', mensaje: err.response?.data?.detail || 'No se pudo crear el grupo.' })
    }
  }

  async function handleGuardarGrupo(grupoId, cambios) {
    try {
      const actualizado = await actualizarGrupo(grupoId, cambios)
      setGrupos((prev) => prev.map((g) => (g.id === grupoId ? actualizado : g)))
    } catch (err) {
      setToast({ tipo: 'error', mensaje: err.response?.data?.detail || 'No se pudo guardar el grupo.' })
    }
  }

  function handleEliminarGrupo(grupoId) {
    setConfirmacion({
      mensaje: '¿Eliminar este grupo? Las preguntas que pertenecen a él quedarán sueltas.',
      onConfirmar: async () => {
        setConfirmacion(null)
        try {
          await eliminarGrupo(grupoId)
          setGrupos((prev) => prev.filter((g) => g.id !== grupoId))
          setPreguntas((prev) => prev.map((p) => (p.grupo_id === grupoId ? { ...p, grupo_id: null } : p)))
        } catch (err) {
          setToast({ tipo: 'error', mensaje: err.response?.data?.detail || 'No se pudo eliminar el grupo.' })
        }
      },
    })
  }

  // ── Preguntas ───────────────────────────────────────────
  async function handleNuevaPregunta() {
    try {
      setCreandoPregunta(true)
      const siguienteOrden = preguntas.length > 0 ? Math.max(...preguntas.map((p) => Number(p.orden))) + 1 : 1
      const creada = await crearPregunta(id, {
        codigo: generarCodigo('p'),
        tipo_codigo: 'texto',
        titulo: '',
        requerida: false,
        orden: siguienteOrden,
      })
      setPreguntas((prev) => [...prev, creada])
    } catch (err) {
      setToast({ tipo: 'error', mensaje: err.response?.data?.detail || 'No se pudo crear la pregunta.' })
    } finally {
      setCreandoPregunta(false)
    }
  }

  async function handleGuardarPregunta(preguntaId, cambios) {
    try {
      const actualizada = await actualizarPregunta(preguntaId, cambios)
      setPreguntas((prev) => prev.map((p) => (p.id === preguntaId ? actualizada : p)))
    } catch (err) {
      const detalle = err.response?.data?.detail
      setToast({
        tipo: 'error',
        mensaje: detalle === 'tipo_invalido' ? 'El tipo de pregunta no es válido.' : (detalle || 'No se pudo guardar la pregunta.'),
      })
    }
  }

  function handleEliminarPregunta(preguntaId) {
    setConfirmacion({
      mensaje: '¿Eliminar esta pregunta?',
      onConfirmar: async () => {
        setConfirmacion(null)
        try {
          await eliminarPregunta(preguntaId)
          setPreguntas((prev) => prev.filter((p) => p.id !== preguntaId))
        } catch (err) {
          setToast({ tipo: 'error', mensaje: err.response?.data?.detail || 'No se pudo eliminar la pregunta.' })
        }
      },
    })
  }

  async function handleDuplicarPregunta(pregunta) {
    try {
      const creada = await crearPregunta(id, {
        grupo_id: pregunta.grupo_id,
        codigo: generarCodigo('p'),
        tipo_codigo: pregunta.tipo.codigo,
        titulo: pregunta.titulo,
        subtitulo: pregunta.subtitulo,
        requerida: pregunta.requerida,
        configuracion: pregunta.configuracion,
        mapea_a: null, // el mapeo a Cliente no se duplica: debe ser único por campo
        orden: Number(pregunta.orden) + 0.5,
      })
      setPreguntas((prev) => [...prev, creada].sort((a, b) => a.orden - b.orden))
    } catch (err) {
      setToast({ tipo: 'error', mensaje: err.response?.data?.detail || 'No se pudo duplicar la pregunta.' })
    }
  }

  async function moverPregunta(pregunta, direccion) {
    const ordenadas = [...preguntas].sort((a, b) => a.orden - b.orden)
    const idx = ordenadas.findIndex((p) => p.id === pregunta.id)
    const vecinoIdx = idx + direccion
    if (vecinoIdx < 0 || vecinoIdx >= ordenadas.length) return
    const vecino = ordenadas[vecinoIdx]

    try {
      const [a, b] = await Promise.all([
        actualizarPregunta(pregunta.id, { orden: vecino.orden }),
        actualizarPregunta(vecino.id, { orden: pregunta.orden }),
      ])
      setPreguntas((prev) => prev.map((p) => {
        if (p.id === a.id) return a
        if (p.id === b.id) return b
        return p
      }).sort((x, y) => x.orden - y.orden))
    } catch (err) {
      setToast({ tipo: 'error', mensaje: err.response?.data?.detail || 'No se pudo reordenar.' })
    }
  }

  if (cargando) return <div className="formbuilder page-enter"><p className="formularios__sub">Cargando…</p></div>
  if (error || !formulario) return (
    <div className="formbuilder page-enter">
      <div className="formularios__error">
        <i className="bi bi-wifi-off" />
        <p>{error || 'Formulario no encontrado.'}</p>
      </div>
    </div>
  )

  const preguntasOrdenadas = [...preguntas].sort((a, b) => a.orden - b.orden)

  return (
    <div className="formbuilder page-enter">

      {/* ── Cabecera ── */}
      <div className="formbuilder__header">
        <Link to="/admin/formularios" className="formbuilder__volver">
          <i className="bi bi-arrow-left" /> Formularios
        </Link>

        <div className="formbuilder__header-campos">
          <input
            className="formbuilder__titulo-input"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onBlur={guardarHeader}
            placeholder="Título del formulario"
          />
          <textarea
            className="formbuilder__descripcion-input"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            onBlur={guardarHeader}
            placeholder="Descripción (opcional) — la verá quien diligencie el formulario"
            rows={2}
          />
        </div>

        <div className="formbuilder__header-acciones">
          <span className={`form-badge form-badge--${formulario.estado.codigo}`}>{formulario.estado.nombre}</span>
          {formulario.estado.codigo === 'activo' && (
            <button className="form-btn-secundario" onClick={copiarUrl}>
              <i className={`bi ${copiado ? 'bi-check-lg' : 'bi-link-45deg'}`} /> {copiado ? 'Copiada' : 'Copiar URL pública'}
            </button>
          )}
          <button className="form-btn-secundario" onClick={() => navigate(`/admin/formularios/${id}/respuestas`)}>
            <i className="bi bi-inbox" /> Ver respuestas
          </button>
          <button className="form-btn-primario" onClick={handlePublicar} disabled={publicando}>
            <i className="bi bi-send" /> {publicando ? 'Publicando…' : 'Publicar'}
          </button>
        </div>
      </div>

      {/* ── Preguntas ── */}
      <div className="formbuilder__preguntas">
        {preguntasOrdenadas.map((p, i) => (
          <PreguntaCard
            key={p.id}
            pregunta={p}
            grupos={grupos}
            pasos={pasos}
            tiposPregunta={tiposPregunta}
            tiposDocumento={tiposDocumento}
            esPrimera={i === 0}
            esUltima={i === preguntasOrdenadas.length - 1}
            onGuardar={(cambios) => handleGuardarPregunta(p.id, cambios)}
            onEliminar={() => handleEliminarPregunta(p.id)}
            onDuplicar={() => handleDuplicarPregunta(p)}
            onMover={(dir) => moverPregunta(p, dir)}
          />
        ))}

        {preguntasOrdenadas.length === 0 && (
          <p className="formularios__sub formbuilder__vacio">Todavía no hay preguntas — agrega la primera abajo.</p>
        )}

        <button className="formbuilder__agregar" onClick={handleNuevaPregunta} disabled={creandoPregunta}>
          <i className="bi bi-plus-circle" /> Agregar pregunta
        </button>
      </div>

      {/* ── Grupos repetibles ── */}
      <section className="formbuilder__seccion">
        <div className="formbuilder__seccion-header">
          <div>
            <h3><i className="bi bi-collection" /> Grupos repetibles</h3>
            <p className="formularios__sub">Bloques que quien responde puede repetir varias veces, ej. "Asegurado adicional". Asigna preguntas a un grupo abajo, en "Más opciones" de cada pregunta.</p>
          </div>
          <button className="form-btn-secundario" onClick={handleNuevoGrupo}>
            <i className="bi bi-plus-lg" /> Nuevo grupo
          </button>
        </div>

        {grupos.length === 0 ? (
          <p className="formularios__sub formbuilder__vacio">Sin grupos — todas las preguntas son sueltas.</p>
        ) : (
          <div className="formbuilder__grupos">
            {grupos.map((g) => (
              <GrupoCard
                key={g.id}
                grupo={g}
                onGuardar={(cambios) => handleGuardarGrupo(g.id, cambios)}
                onEliminar={() => handleEliminarGrupo(g.id)}
              />
            ))}
          </div>
        )}
      </section>

      <Toast toast={toast} onCerrar={() => setToast(null)} />
      <ConfirmDialog confirmacion={confirmacion} onCancelar={() => setConfirmacion(null)} />
    </div>
  )
}

// ============================================================
// Tarjeta de grupo — editable inline, igual criterio que el
// título del formulario (se guarda sola al salir del campo).
// ============================================================
function GrupoCard({ grupo, onGuardar, onEliminar }) {
  const [titulo, setTitulo] = useState(grupo.titulo_template)
  const [min, setMin] = useState(grupo.minimo_repeticiones)
  const [max, setMax] = useState(grupo.maximo_repeticiones ?? '')

  return (
    <div className="formbuilder__grupo-card">
      <div className="formbuilder__grupo-campos">
        <input
          className="formbuilder__grupo-titulo-input"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onBlur={() => titulo.trim() && onGuardar({ titulo_template: titulo.trim() })}
          placeholder="Nombre del grupo (ej. Asegurado)"
        />
        <div className="formbuilder__grupo-reps">
          <label>
            Mín. repeticiones
            <input
              type="number"
              min="0"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              onBlur={() => onGuardar({ minimo_repeticiones: parseInt(min, 10) || 0 })}
            />
          </label>
          <label>
            Máx. (opcional)
            <input
              type="number"
              min="0"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              onBlur={() => onGuardar({ maximo_repeticiones: max === '' ? null : parseInt(max, 10) })}
            />
          </label>
        </div>
      </div>
      <button className="form-btn-icon form-btn-icon--danger" title="Eliminar grupo" onClick={onEliminar}>
        <i className="bi bi-trash" />
      </button>
    </div>
  )
}

// ============================================================
// Tarjeta de pregunta — estilo Microsoft Forms: siempre editable,
// sin "Guardar"/"Cancelar". "Más opciones" esconde lo avanzado
// (grupo, vínculo a cliente, código interno) para no saturar.
// ============================================================
function PreguntaCard({ pregunta, grupos, pasos, tiposPregunta, tiposDocumento, esPrimera, esUltima, onGuardar, onEliminar, onDuplicar, onMover }) {
  const [titulo, setTitulo] = useState(pregunta.titulo)
  const [subtitulo, setSubtitulo] = useState(pregunta.subtitulo || '')
  const [choices, setChoices] = useState(pregunta.configuracion?.choices || [])
  const [branching, setBranching] = useState(pregunta.configuracion?.branching || {})
  const [masOpciones, setMasOpciones] = useState(false)

  const esOpcion = pregunta.tipo.codigo === 'opcion'

  // Si la pregunta está vinculada a un dato del Cliente, su tipo ya
  // no es libre: se fuerza al correcto para esa columna real de la
  // DB y el selector de tipo se bloquea (ver docs/DEUDA.md — evita
  // que "Nombre" quede como tipo "Número").
  const campoVinculado = CAMPOS_CLIENTE.find((c) => c.value === pregunta.mapea_a?.campo)
  const esTipoDocumentoVinculado = pregunta.mapea_a?.campo === 'tipo_documento'

  // "Tipo de documento" no se escribe a mano: sus opciones son
  // siempre las del catálogo real de tipos_documento, para que el
  // valor que elige el usuario público coincida con lo que el
  // backend espera al crear el Cliente.
  useEffect(() => {
    if (!esTipoDocumentoVinculado || tiposDocumento.length === 0) return
    const nombresCatalogo = tiposDocumento.map((td) => td.nombre)
    const yaSincronizado = nombresCatalogo.length === choices.length && nombresCatalogo.every((n, i) => n === choices[i])
    if (!yaSincronizado) guardarChoices(nombresCatalogo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esTipoDocumentoVinculado, tiposDocumento])

  function guardarChoices(nuevas) {
    const limpias = nuevas.filter((c) => c.trim() !== '')
    // Si se borra o renombra una opción, su salto condicional ya no
    // aplica a nada — se descarta para no dejar basura en el JSON.
    const branchingLimpio = Object.fromEntries(
      Object.entries(branching).filter(([opcion]) => limpias.includes(opcion))
    )
    setChoices(nuevas)
    setBranching(branchingLimpio)
    onGuardar({ configuracion: { choices: limpias, branching: branchingLimpio } })
  }

  function guardarBranching(opcion, destino) {
    const nuevo = { ...branching }
    if (destino) nuevo[opcion] = destino
    else delete nuevo[opcion]
    setBranching(nuevo)
    onGuardar({ configuracion: { choices: choices.filter((c) => c.trim() !== ''), branching: nuevo } })
  }

  return (
    <div className="formbuilder__pcard">
      <div className="formbuilder__pcard-barra">
        <div className="formbuilder__pcard-orden">
          <button className="formbuilder__pcard-mover" disabled={esPrimera} onClick={() => onMover(-1)} title="Subir">
            <i className="bi bi-chevron-up" />
          </button>
          <button className="formbuilder__pcard-mover" disabled={esUltima} onClick={() => onMover(1)} title="Bajar">
            <i className="bi bi-chevron-down" />
          </button>
        </div>

        <select
          className="formbuilder__pcard-tipo"
          value={pregunta.tipo.codigo}
          onChange={(e) => onGuardar({ tipo_codigo: e.target.value })}
          disabled={Boolean(campoVinculado)}
          title={campoVinculado ? `Tipo fijo: vinculada a "${campoVinculado.label}" del cliente` : undefined}
        >
          {tiposPregunta.map((t) => (
            <option key={t.id} value={t.codigo}>{t.nombre}</option>
          ))}
        </select>

        {campoVinculado && (
          <i className="bi bi-lock-fill formbuilder__pcard-candado" title={`Tipo fijo: vinculada a "${campoVinculado.label}" del cliente`} />
        )}

        <i className={`bi ${iconoDe(pregunta.tipo.codigo)} formbuilder__pcard-icono`} />

        <div className="formbuilder__pcard-acciones">
          <button className="form-btn-icon" title="Duplicar" onClick={onDuplicar}>
            <i className="bi bi-files" />
          </button>
          <button className="form-btn-icon form-btn-icon--danger" title="Eliminar" onClick={onEliminar}>
            <i className="bi bi-trash" />
          </button>
        </div>
      </div>

      <input
        className="formbuilder__pcard-titulo"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        onBlur={() => onGuardar({ titulo: titulo.trim() || 'Pregunta sin título' })}
        placeholder="Escribe la pregunta…"
      />
      <input
        className="formbuilder__pcard-subtitulo"
        value={subtitulo}
        onChange={(e) => setSubtitulo(e.target.value)}
        onBlur={() => onGuardar({ subtitulo: subtitulo.trim() || null })}
        placeholder="Descripción (opcional)"
      />

      {esOpcion ? (
        <div className="formbuilder__choices">
          {esTipoDocumentoVinculado ? (
            <>
              <p className="formbuilder__choices-sincronizadas">
                <i className="bi bi-link-45deg" /> Opciones sincronizadas con el catálogo de tipos de documento (se editan desde Catálogos, no aquí).
              </p>
              {choices.map((c) => (
                <div key={c} className="formbuilder__choice-fila formbuilder__choice-fila--bloqueada">
                  <i className="bi bi-lock-fill" /> {c}
                </div>
              ))}
            </>
          ) : (
            <>
              {choices.map((c, i) => (
                <div key={i} className="formbuilder__choice-fila">
                  <i className="bi bi-ui-radios" />
                  <input
                    value={c}
                    onChange={(e) => {
                      const nuevas = [...choices]
                      nuevas[i] = e.target.value
                      setChoices(nuevas)
                    }}
                    onBlur={() => guardarChoices(choices)}
                    placeholder={`Opción ${i + 1}`}
                  />
                  <button className="form-btn-icon" title="Quitar opción" onClick={() => guardarChoices(choices.filter((_, idx) => idx !== i))}>
                    <i className="bi bi-x" />
                  </button>
                </div>
              ))}
              <button className="formbuilder__choice-agregar" onClick={() => setChoices([...choices, ''])}>
                <i className="bi bi-plus" /> Agregar opción
              </button>
            </>
          )}

          {choices.filter((c) => c.trim() !== '').length > 0 && (
            <div className="formbuilder__branching">
              <span className="formbuilder__branching-titulo">
                <i className="bi bi-signpost-split" /> Saltos condicionales
              </span>
              {choices.filter((c) => c.trim() !== '').map((c) => (
                <div key={c} className="formbuilder__branching-fila">
                  <span>Si responde <strong>{c}</strong>, ir a</span>
                  <select
                    value={branching[c] || ''}
                    onChange={(e) => guardarBranching(c, e.target.value)}
                  >
                    <option value="">Siguiente pregunta (flujo normal)</option>
                    <option value={BRANCHING_FIN}>Finalizar formulario</option>
                    {pasos.filter((p) => p.codigo !== pregunta.codigo).map((p) => (
                      <option key={p.codigo} value={p.codigo}>{p.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="formbuilder__preview">
          <i className={`bi ${iconoDe(pregunta.tipo.codigo)}`} /> {pregunta.tipo.nombre}
        </div>
      )}

      <div className="formbuilder__pcard-footer">
        <label className="formbuilder__switch-label">
          <button
            className={`formbuilder__switch ${pregunta.requerida ? 'formbuilder__switch--on' : ''}`}
            onClick={() => onGuardar({ requerida: !pregunta.requerida })}
          >
            <span className="formbuilder__switch-bola" />
          </button>
          Obligatoria
        </label>
        <button className="formbuilder__mas-opciones" onClick={() => setMasOpciones((v) => !v)}>
          <i className={`bi ${masOpciones ? 'bi-chevron-up' : 'bi-gear'}`} /> Más opciones
        </button>
      </div>

      {masOpciones && (
        <div className="formbuilder__avanzado">
          <label>
            Grupo repetible
            <select
              value={pregunta.grupo_id || ''}
              onChange={(e) => onGuardar({ grupo_id: e.target.value || null })}
            >
              <option value="">Pregunta suelta (sin grupo)</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>{g.titulo_template}</option>
              ))}
            </select>
          </label>

          {!pregunta.grupo_id && (
            <label>
              Vincular a un dato del cliente
              <select
                value={pregunta.mapea_a?.campo || ''}
                onChange={(e) => {
                  const campo = e.target.value
                  if (!campo) {
                    onGuardar({ mapea_a: null })
                    return
                  }
                  // Al vincular, el tipo se fuerza al correcto para esa
                  // columna real — no queda a libre elección del admin.
                  const info = CAMPOS_CLIENTE.find((c) => c.value === campo)
                  onGuardar({ mapea_a: { entidad: 'cliente', campo }, tipo_codigo: info.tipoForzado })
                }}
              >
                <option value="">No se vincula</option>
                {CAMPOS_CLIENTE.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              {campoVinculado && (
                <span className="formbuilder__avanzado-nota">
                  <i className="bi bi-info-circle" /> El tipo de esta pregunta quedó fijo en "{tiposPregunta.find((t) => t.codigo === campoVinculado.tipoForzado)?.nombre || campoVinculado.tipoForzado}".
                </span>
              )}
            </label>
          )}

          <label>
            Código interno (identificador técnico, no editable)
            <input value={pregunta.codigo} disabled title="Se genera solo al crear la pregunta. Editarlo podría romper saltos condicionales que ya apunten a él." />
          </label>
        </div>
      )}
    </div>
  )
}
