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
import PreguntaCard from './PreguntaCard.jsx'
import './Formularios.css'
import './FormularioBuilder.css'

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

// ── Mezcla preguntas sueltas y grupos repetibles en una sola
// secuencia, en el MISMO orden que usará el público
// (FormularioPublico.jsx -> construirEntradas): la posición de un
// grupo la decide su propio "orden" (FormularioGrupoPregunta.orden),
// NUNCA dónde caigan sus preguntas miembro -- ignorar esto hacía que
// el admin mostrara un orden distinto al que de verdad ve quien
// responde (bug real encontrado en PAC 60+ ya importado: el grupo de
// Asegurado tenía orden=1 por autoasignación, antes de que el
// Tomador, aunque sus preguntas miembro vinieran después -- ver
// docs/ESTADO.md). Una pregunta con un grupo_id que ya no existe
// (grupo eliminado a medias, no debería pasar en flujo normal) se
// trata como suelta en vez de desaparecer. ──
function construirEntradasAdmin(preguntas, grupos) {
  const idsGrupo = new Set(grupos.map((g) => g.id))

  const sueltas = preguntas
    .filter((p) => !p.grupo_id || !idsGrupo.has(p.grupo_id))
    .map((p) => ({ tipo: 'suelta', orden: Number(p.orden), pregunta: p }))

  const bloquesGrupo = grupos.map((g) => ({
    tipo: 'grupo',
    orden: Number(g.orden),
    grupo: g,
    preguntas: preguntas.filter((p) => p.grupo_id === g.id).sort((a, b) => a.orden - b.orden),
  }))

  return [...sueltas, ...bloquesGrupo].sort((a, b) => a.orden - b.orden)
}

// ── El admin diseña página por página, igual que lo va a ver quien
// responda: cada "seccion" suelta abre una página nueva. Una
// "seccion" DENTRO de un grupo repetible (la que trae el importador
// de MS Forms, ej. "INFORMACIÓN BÁSICA DEL ASEGURADO") no cuenta --
// esa es el encabezado del bloque, no un salto de página. ──
function construirPaginasAdmin(entradas) {
  const paginas = [{ seccion: null, entradas: [] }]
  for (const entrada of entradas) {
    if (entrada.tipo === 'suelta' && entrada.pregunta.tipo.codigo === 'seccion') {
      paginas.push({ seccion: entrada.pregunta, entradas: [] })
    } else {
      paginas[paginas.length - 1].entradas.push(entrada)
    }
  }
  // La primera página puede quedar vacía si el formulario empieza
  // directo con una "seccion" -- no tiene sentido mostrarla.
  return paginas[0].entradas.length === 0 && paginas.length > 1 ? paginas.slice(1) : paginas
}

// ── Numeración ESTÁTICA (a diferencia del público, acá no hay
// respuestas que oculten preguntas por branching -- el admin ve la
// estructura completa), en el mismo orden en que se va a pintar
// (las entradas ya mezcladas, no la tabla cruda). Cada pregunta real
// (no "seccion") recibe un número secuencial; las de un grupo
// repetible cuentan una sola vez, no por cada repetición que verá
// quien responda. ──
function numerarEntradas(entradas) {
  const mapa = {}
  let contador = 0
  for (const entrada of entradas) {
    if (entrada.tipo === 'suelta') {
      if (entrada.pregunta.tipo.codigo === 'seccion') continue
      contador += 1
      mapa[entrada.pregunta.codigo] = contador
    } else {
      for (const p of entrada.preguntas) {
        if (p.tipo.codigo === 'seccion') continue
        contador += 1
        mapa[p.codigo] = contador
      }
    }
  }
  return mapa
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
  const [paginaIdx, setPaginaIdx] = useState(0)

  // "Pasos" posibles como destino de un salto condicional: preguntas
  // sueltas (cada una es su propia pantalla en la vista pública) y
  // grupos repetibles (el bloque completo es una pantalla).
  const pasos = useMemo(() => [
    ...preguntas.filter((p) => !p.grupo_id).map((p) => ({ codigo: p.codigo, label: p.titulo || 'Pregunta sin título' })),
    ...grupos.map((g) => ({ codigo: g.codigo, label: `Grupo: ${g.titulo_template}` })),
  ], [preguntas, grupos])

  // El admin diseña página por página, igual que lo va a ver quien
  // responda (ver comentario de construirEntradasAdmin arriba).
  const preguntasOrdenadas = useMemo(() => [...preguntas].sort((a, b) => a.orden - b.orden), [preguntas])
  const entradasAdmin = useMemo(() => construirEntradasAdmin(preguntas, grupos), [preguntas, grupos])
  const paginasAdmin = useMemo(() => construirPaginasAdmin(entradasAdmin), [entradasAdmin])
  const numeros = useMemo(() => numerarEntradas(entradasAdmin), [entradasAdmin])
  // Clamp en vez de un efecto: si se elimina la última página mientras
  // está activa, cae a la nueva última sin esperar un render extra.
  const paginaIdxSegura = Math.min(paginaIdx, Math.max(paginasAdmin.length - 1, 0))
  const paginaActual = paginasAdmin[paginaIdxSegura] || { seccion: null, entradas: [] }
  const gruposConPreguntas = useMemo(() => new Set(preguntas.filter((p) => p.grupo_id).map((p) => p.grupo_id)), [preguntas])
  const gruposHuerfanos = useMemo(() => grupos.filter((g) => !gruposConPreguntas.has(g.id)), [grupos, gruposConPreguntas])

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

  // Grupos/preguntas se guardan al vuelo (como siempre en este builder),
  // pero "Publicar" necesita saber si lo ya guardado difiere de la
  // última versión publicada (formulario.tiene_cambios_sin_publicar,
  // calculado en el backend) -- se refresca tras cada cambio porque las
  // respuestas de crear/actualizar/eliminar grupo o pregunta no traen
  // ese dato (solo el propio grupo/pregunta), a diferencia de
  // guardarHeader que sí llama a actualizarFormulario directo.
  const refrescarCambiosPendientes = useCallback(() => {
    obtenerFormulario(id).then(setFormulario).catch(() => {})
  }, [id])

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

  // Archivar o volver a borrador invalida la URL pública vieja (el
  // backend genera un token_publico nuevo al cambiar de estado, ver
  // FormularioService.actualizar) -- mismo criterio que Formularios.jsx.
  function handleCambiarEstado(estadoCodigo, mensaje) {
    setConfirmacion({
      mensaje,
      textoConfirmar: estadoCodigo === 'archivado' ? 'Archivar' : 'Volver a borrador',
      onConfirmar: async () => {
        setConfirmacion(null)
        try {
          const actualizado = await actualizarFormulario(id, { estado_codigo: estadoCodigo })
          setFormulario(actualizado)
        } catch (err) {
          setToast({ tipo: 'error', mensaje: err.response?.data?.detail || 'No se pudo cambiar el estado.' })
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
      refrescarCambiosPendientes()
    } catch (err) {
      setToast({ tipo: 'error', mensaje: err.response?.data?.detail || 'No se pudo crear el grupo.' })
    }
  }

  async function handleGuardarGrupo(grupoId, cambios) {
    try {
      const actualizado = await actualizarGrupo(grupoId, cambios)
      setGrupos((prev) => prev.map((g) => (g.id === grupoId ? actualizado : g)))
      refrescarCambiosPendientes()
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
          refrescarCambiosPendientes()
        } catch (err) {
          setToast({ tipo: 'error', mensaje: err.response?.data?.detail || 'No se pudo eliminar el grupo.' })
        }
      },
    })
  }

  // ── Preguntas ───────────────────────────────────────────
  // La pregunta nueva va en la PÁGINA que el admin está viendo, no
  // siempre al final del formulario -- si no, "Agregar pregunta"
  // estando en la página 2 de 5 la mandaría a la página 5 sin avisar.
  function calcularOrdenNuevaPregunta() {
    const ordenesPagina = [
      ...(paginaActual.seccion ? [Number(paginaActual.seccion.orden)] : []),
      ...paginaActual.entradas.flatMap((e) => e.tipo === 'suelta' ? [e.orden] : [e.orden, ...e.preguntas.map((p) => Number(p.orden))]),
    ]
    const base = ordenesPagina.length > 0 ? Math.max(...ordenesPagina) : 0
    const siguientePagina = paginasAdmin[paginaIdxSegura + 1]
    // Punto medio entre el final de esta página y el inicio de la
    // siguiente: así nunca se cuela en la página de al lado, sin
    // importar cuántas preguntas se agreguen aquí después.
    return siguientePagina?.seccion ? (base + Number(siguientePagina.seccion.orden)) / 2 : base + 1
  }

  async function handleNuevaPregunta() {
    try {
      setCreandoPregunta(true)
      const creada = await crearPregunta(id, {
        codigo: generarCodigo('p'),
        tipo_codigo: 'texto',
        titulo: '',
        requerida: false,
        orden: calcularOrdenNuevaPregunta(),
      })
      setPreguntas((prev) => [...prev, creada])
      refrescarCambiosPendientes()
    } catch (err) {
      setToast({ tipo: 'error', mensaje: err.response?.data?.detail || 'No se pudo crear la pregunta.' })
    } finally {
      setCreandoPregunta(false)
    }
  }

  // Siempre se agrega como una página nueva AL FINAL -- el admin
  // reordena después con los botones subir/bajar si la quiere en otro
  // lugar. Navega a esa página nueva de inmediato para que no parezca
  // que "no pasó nada".
  async function handleNuevaSeccion() {
    try {
      setCreandoPregunta(true)
      const siguienteOrden = preguntas.length > 0 ? Math.max(...preguntas.map((p) => Number(p.orden))) + 1 : 1
      const idxNuevaPagina = paginasAdmin.length
      const creada = await crearPregunta(id, {
        codigo: generarCodigo('seccion'),
        tipo_codigo: 'seccion',
        titulo: 'Nueva sección',
        requerida: false,
        orden: siguienteOrden,
      })
      setPreguntas((prev) => [...prev, creada])
      setPaginaIdx(idxNuevaPagina)
      refrescarCambiosPendientes()
    } catch (err) {
      setToast({ tipo: 'error', mensaje: err.response?.data?.detail || 'No se pudo crear la sección.' })
    } finally {
      setCreandoPregunta(false)
    }
  }

  async function handleGuardarPregunta(preguntaId, cambios) {
    try {
      const actualizada = await actualizarPregunta(preguntaId, cambios)
      setPreguntas((prev) => prev.map((p) => (p.id === preguntaId ? actualizada : p)))
      refrescarCambiosPendientes()
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
          refrescarCambiosPendientes()
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
      refrescarCambiosPendientes()
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
      refrescarCambiosPendientes()
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
            <>
              <button className="form-btn-secundario" onClick={copiarUrl}>
                <i className={`bi ${copiado ? 'bi-check-lg' : 'bi-link-45deg'}`} /> {copiado ? 'Copiada' : 'Copiar URL pública'}
              </button>
              <button
                className="form-btn-secundario"
                onClick={() => handleCambiarEstado(
                  'archivado',
                  'Al archivar este formulario ya no se podrá responder y su URL pública actual quedará invalidada. ¿Continuar?'
                )}
              >
                <i className="bi bi-archive" /> Archivar
              </button>
            </>
          )}
          {formulario.estado.codigo === 'archivado' && (
            <button
              className="form-btn-secundario"
              onClick={() => handleCambiarEstado(
                'borrador',
                'Al volver a borrador la URL pública actual quedará invalidada; tendrás que publicar de nuevo para obtener una nueva. ¿Continuar?'
              )}
            >
              <i className="bi bi-arrow-counterclockwise" /> Volver a borrador
            </button>
          )}
          <button className="form-btn-secundario" onClick={() => navigate(`/admin/formularios/${id}/respuestas`)}>
            <i className="bi bi-inbox" /> Ver respuestas
          </button>
          <button
            className="form-btn-primario"
            onClick={handlePublicar}
            disabled={publicando || !formulario.tiene_cambios_sin_publicar}
            title={!publicando && !formulario.tiene_cambios_sin_publicar ? 'No hay cambios desde la última publicación' : undefined}
          >
            <i className="bi bi-send" /> {publicando ? 'Publicando…' : 'Publicar'}
          </button>
        </div>
      </div>

      {/* ── Paginador: una pestaña por página, igual que verá quien
          responda (cada "seccion" abre una página nueva). ── */}
      {paginasAdmin.length > 1 && (
        <div className="formbuilder__paginador" role="tablist">
          {paginasAdmin.map((pag, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === paginaIdxSegura}
              className={`formbuilder__paginador-tab ${i === paginaIdxSegura ? 'formbuilder__paginador-tab--activa' : ''}`}
              onClick={() => setPaginaIdx(i)}
            >
              {pag.seccion ? (pag.seccion.titulo || `Página ${i + 1}`) : 'Inicio'}
            </button>
          ))}
        </div>
      )}

      {/* ── Preguntas de la página actual ── */}
      <div className="formbuilder__preguntas">
        {paginaActual.seccion && (
          <SeccionHeaderCard
            pregunta={paginaActual.seccion}
            onGuardar={(cambios) => handleGuardarPregunta(paginaActual.seccion.id, cambios)}
            onEliminar={() => handleEliminarPregunta(paginaActual.seccion.id)}
          />
        )}

        {paginaActual.entradas.map((entrada) => entrada.tipo === 'suelta' ? (
          <PreguntaCard
            key={entrada.pregunta.id}
            pregunta={entrada.pregunta}
            grupos={grupos}
            pasos={pasos}
            tiposPregunta={tiposPregunta}
            tiposDocumento={tiposDocumento}
            numero={numeros[entrada.pregunta.codigo]}
            esPrimera={preguntasOrdenadas[0]?.id === entrada.pregunta.id}
            esUltima={preguntasOrdenadas[preguntasOrdenadas.length - 1]?.id === entrada.pregunta.id}
            onGuardar={(cambios) => handleGuardarPregunta(entrada.pregunta.id, cambios)}
            onEliminar={() => handleEliminarPregunta(entrada.pregunta.id)}
            onDuplicar={() => handleDuplicarPregunta(entrada.pregunta)}
            onMover={(dir) => moverPregunta(entrada.pregunta, dir)}
          />
        ) : (
          <div key={entrada.grupo.id} className="formbuilder__grupo-bloque">
            <GrupoCard
              grupo={entrada.grupo}
              onGuardar={(cambios) => handleGuardarGrupo(entrada.grupo.id, cambios)}
              onEliminar={() => handleEliminarGrupo(entrada.grupo.id)}
            />
            <div className="formbuilder__grupo-bloque-preguntas">
              {entrada.preguntas.map((p) => (
                <PreguntaCard
                  key={p.id}
                  pregunta={p}
                  grupos={grupos}
                  pasos={pasos}
                  tiposPregunta={tiposPregunta}
                  tiposDocumento={tiposDocumento}
                  numero={numeros[p.codigo]}
                  esPrimera={preguntasOrdenadas[0]?.id === p.id}
                  esUltima={preguntasOrdenadas[preguntasOrdenadas.length - 1]?.id === p.id}
                  onGuardar={(cambios) => handleGuardarPregunta(p.id, cambios)}
                  onEliminar={() => handleEliminarPregunta(p.id)}
                  onDuplicar={() => handleDuplicarPregunta(p)}
                  onMover={(dir) => moverPregunta(p, dir)}
                />
              ))}
            </div>
          </div>
        ))}

        {paginaActual.entradas.length === 0 && !paginaActual.seccion && (
          <p className="formularios__sub formbuilder__vacio">Todavía no hay preguntas — agrega la primera abajo.</p>
        )}

        <div className="formbuilder__pagina-acciones">
          <button className="formbuilder__agregar" onClick={handleNuevaPregunta} disabled={creandoPregunta}>
            <i className="bi bi-plus-circle" /> Agregar pregunta
          </button>
          <button className="form-btn-secundario" onClick={handleNuevaSeccion} disabled={creandoPregunta}>
            <i className="bi bi-file-plus" /> Agregar sección (página nueva)
          </button>
        </div>
      </div>

      {/* ── Anterior / Siguiente, igual que el público ── */}
      {paginasAdmin.length > 1 && (
        <div className="formbuilder__paginador-nav">
          <button className="form-btn-secundario" disabled={paginaIdxSegura === 0} onClick={() => setPaginaIdx(paginaIdxSegura - 1)}>
            <i className="bi bi-chevron-left" /> Anterior
          </button>
          <span className="formularios__sub">Página {paginaIdxSegura + 1} de {paginasAdmin.length}</span>
          <button className="form-btn-secundario" disabled={paginaIdxSegura === paginasAdmin.length - 1} onClick={() => setPaginaIdx(paginaIdxSegura + 1)}>
            Siguiente <i className="bi bi-chevron-right" />
          </button>
        </div>
      )}

      {/* ── Grupos sin preguntas asignadas todavía ── */}
      <section className="formbuilder__seccion">
        <div className="formbuilder__seccion-header">
          <div>
            <h3><i className="bi bi-collection" /> Grupos repetibles</h3>
            <p className="formularios__sub">Bloques que quien responde puede repetir varias veces, ej. "Asegurado adicional". Los grupos con preguntas ya asignadas se ven junto a ellas, arriba; acá solo quedan los que todavía no tienen ninguna — asígnalas en "Más opciones" de cada pregunta.</p>
          </div>
          <button className="form-btn-secundario" onClick={handleNuevoGrupo}>
            <i className="bi bi-plus-lg" /> Nuevo grupo
          </button>
        </div>

        {gruposHuerfanos.length === 0 ? (
          <p className="formularios__sub formbuilder__vacio">{grupos.length === 0 ? 'Sin grupos — todas las preguntas son sueltas.' : 'Todos los grupos ya tienen preguntas asignadas.'}</p>
        ) : (
          <div className="formbuilder__grupos">
            {gruposHuerfanos.map((g) => (
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
// Encabezado de página — la pregunta tipo "seccion" que abre esta
// página no se edita como una PreguntaCard más (no tiene tipo, ni
// choices, ni "obligatoria"): es el título que verá quien responda
// al llegar a esta pantalla, igual que el h2 en FormularioPublico.jsx.
// ============================================================
function SeccionHeaderCard({ pregunta, onGuardar, onEliminar }) {
  const [titulo, setTitulo] = useState(pregunta.titulo)
  const [subtitulo, setSubtitulo] = useState(pregunta.subtitulo || '')

  return (
    <div className="formbuilder__seccion-pagina">
      <i className="bi bi-distribute-vertical formbuilder__seccion-pagina-icono" />
      <div className="formbuilder__seccion-pagina-campos">
        <input
          className="formbuilder__seccion-pagina-titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onBlur={() => onGuardar({ titulo: titulo.trim() || 'Nueva sección' })}
          placeholder="Título de la sección"
        />
        <input
          className="formbuilder__seccion-pagina-subtitulo"
          value={subtitulo}
          onChange={(e) => setSubtitulo(e.target.value)}
          onBlur={() => onGuardar({ subtitulo: subtitulo.trim() || null })}
          placeholder="Subtítulo (opcional)"
        />
      </div>
      <button className="form-btn-icon form-btn-icon--danger" title="Eliminar esta sección (sus preguntas pasan a la página anterior)" onClick={onEliminar}>
        <i className="bi bi-trash" />
      </button>
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

