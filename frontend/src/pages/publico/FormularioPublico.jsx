// ============================================================
// src/pages/publico/FormularioPublico.jsx
// Vista pública (sin login) que renderiza un formulario por su
// token_publico y envía la respuesta. Ruta: /f/:token
//
// Páginas estilo Microsoft Forms: una pregunta de tipo "seccion"
// marca el inicio de una página nueva; todo lo que hay entre dos
// secciones se muestra junto, en una sola pantalla con scroll.
// El branching (configuracion.branching, solo en preguntas tipo
// "opcion") sigue siendo por pregunta, pero su efecto depende de
// dónde esté el destino:
//   - Si el destino está en la MISMA página: se oculta en vivo
//     todo lo que quedó entre la pregunta y el destino (sin
//     navegar, es la misma pantalla).
//   - Si el destino está en OTRA página (o es "Finalizar"): se
//     resuelve al presionar "Siguiente", saltando directo a esa
//     página sin pasar por las intermedias.
// Datos: api/formularios.js (obtenerFormularioPublico, enviarRespuestaPublica)
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { obtenerFormularioPublico, enviarRespuestaPublica } from '../../api/formularios.js'
import Toast from '../../components/Toast.jsx'
import './FormularioPublico.css'

// Mismo valor reservado que BranchingCodigos.FIN en el backend.
const BRANCHING_FIN = '__fin__'

// ── Lista plana de "entradas" (preguntas sueltas + grupos
// repetibles) en orden: comparten la misma escala de `orden`. ──
function construirEntradas(estructura) {
  const sueltas = estructura.preguntas
    .filter((p) => p.grupo_id === null)
    .map((p) => ({ tipo: 'pregunta', orden: Number(p.orden), codigo: p.codigo, data: p }))

  const grupos = estructura.grupos.map((g) => ({
    tipo: 'grupo',
    orden: Number(g.orden),
    codigo: g.codigo,
    data: g,
    preguntas: estructura.preguntas.filter((p) => p.grupo_id === g.id),
  }))

  return [...sueltas, ...grupos].sort((a, b) => a.orden - b.orden)
}

// ── Agrupa las entradas en páginas: cada pregunta tipo "seccion"
// cierra la página anterior y abre una nueva con su título. Si el
// formulario no tiene ninguna "seccion", todo queda en una sola
// página (comportamiento antes del builder de páginas). ──
function construirPaginas(entradas) {
  const paginas = [{ titulo: null, subtitulo: null, inicioCodigo: null, entradas: [] }]

  for (const entrada of entradas) {
    if (entrada.tipo === 'pregunta' && entrada.data.tipo_codigo === 'seccion') {
      paginas.push({ titulo: entrada.data.titulo, subtitulo: entrada.data.subtitulo, inicioCodigo: entrada.codigo, entradas: [] })
    } else {
      paginas[paginas.length - 1].entradas.push(entrada)
    }
  }

  // La primera página puede quedar vacía si el formulario empieza
  // directo con una "seccion" — no tiene sentido mostrarla.
  return paginas[0].entradas.length === 0 && paginas.length > 1 ? paginas.slice(1) : paginas
}

// ── Ubica un código (de pregunta o de grupo) dentro de las
// páginas: en qué página está y en qué posición de sus entradas
// (o posición 0 si el código es el marcador "seccion" de esa
// página — ya no vive en `entradas`, se usó para abrirla). ──
function ubicarCodigo(codigo, paginas) {
  for (let i = 0; i < paginas.length; i++) {
    if (paginas[i].inicioCodigo === codigo) return { paginaIdx: i, posicion: 0 }
    const pos = paginas[i].entradas.findIndex((e) => e.codigo === codigo)
    if (pos !== -1) return { paginaIdx: i, posicion: pos }
  }
  return null
}

// ── Resuelve, para la página actual, qué entradas se ven y si la
// respuesta actual ya decidió saltar a otra página o finalizar.
//
// Visibilidad: cualquier entrada que sea el destino de ALGUNA
// opción de una pregunta tipo "opcion" (en la misma página) queda
// "controlada" — oculta por defecto, y solo se muestra cuando la
// respuesta actual de esa pregunta coincide exactamente con la
// opción que la activa. Si dos preguntas compiten por el mismo
// destino con distintos valores, basta que UNA coincida. Lo que
// nadie declara como destino de nadie se muestra siempre. ──
function resolverPagina(paginaIdx, paginas, respuestasSueltas) {
  const pagina = paginas[paginaIdx]

  // 1. Quién controla a quién, dentro de esta misma página.
  const controladoPor = {} // { [codigoDestino]: [{ preguntaCodigo, valor }] }
  for (const entrada of pagina.entradas) {
    if (entrada.tipo !== 'pregunta' || entrada.data.tipo_codigo !== 'opcion') continue

    for (const [valor, destino] of Object.entries(entrada.data.configuracion?.branching || {})) {
      if (destino === BRANCHING_FIN) continue
      const ubicacion = ubicarCodigo(destino, paginas)
      if (ubicacion && ubicacion.paginaIdx === paginaIdx) {
        controladoPor[destino] = controladoPor[destino] || []
        controladoPor[destino].push({ preguntaCodigo: entrada.data.codigo, valor })
      }
    }
  }

  const visibles = pagina.entradas.filter((entrada) => {
    const controladores = controladoPor[entrada.codigo]
    if (!controladores) return true
    return controladores.some((c) => respuestasSueltas[c.preguntaCodigo] === c.valor)
  })

  // 2. Salto a otra página o "Finalizar": la primera pregunta
  // respondida (en orden) cuyo destino actual no esté en esta
  // misma página decide la navegación (gana la primera, de arriba
  // a abajo, si hay varias con regla configurada).
  let overrideDestino = null
  for (const entrada of pagina.entradas) {
    if (entrada.tipo !== 'pregunta' || entrada.data.tipo_codigo !== 'opcion') continue

    const valor = respuestasSueltas[entrada.data.codigo]
    const destino = entrada.data.configuracion?.branching?.[valor]
    if (!destino) continue

    if (destino === BRANCHING_FIN) {
      overrideDestino = { tipo: 'fin' }
      break
    }

    const ubicacion = ubicarCodigo(destino, paginas)
    // Destino borrado después de armar el salto: seguir el flujo
    // normal de páginas en vez de dejar al usuario atascado.
    if (ubicacion && ubicacion.paginaIdx !== paginaIdx) {
      overrideDestino = { tipo: 'pagina', paginaIdx: ubicacion.paginaIdx }
      break
    }
  }

  return { visibles, overrideDestino }
}

// ============================================================
// Campo de una pregunta — un solo input según tipo_codigo.
// ============================================================
function CampoPregunta({ pregunta, valor, onChange, invalido }) {
  const tipo = pregunta.tipo_codigo
  const id = `campo-${pregunta.codigo}`

  return (
    <div className={`fpub-campo ${invalido ? 'fpub-campo--invalido' : ''}`}>
      <label id={id} htmlFor={tipo === 'opcion' || tipo === 'nps' || tipo === 'calificacion' ? undefined : id} className="fpub-campo__label">
        {pregunta.titulo}
        {pregunta.requerida && <span className="fpub-requerido" aria-hidden="true"> *</span>}
      </label>
      {pregunta.subtitulo && <p className="fpub-campo__ayuda">{pregunta.subtitulo}</p>}

      {tipo === 'opcion' ? (
        <div className="fpub-opciones" role="radiogroup" aria-labelledby={id}>
          {(pregunta.configuracion?.choices || []).map((opcion) => (
            <label key={opcion} className="fpub-opcion">
              <input
                type="radio"
                name={id}
                checked={valor === opcion}
                onChange={() => onChange(opcion)}
              />
              {opcion}
            </label>
          ))}
        </div>
      ) : tipo === 'nps' ? (
        <div className="fpub-escala">
          {Array.from({ length: 11 }, (_, i) => i).map((n) => (
            <button
              key={n}
              type="button"
              className={`fpub-escala__num ${Number(valor) === n ? 'fpub-escala__num--sel' : ''}`}
              onClick={() => onChange(n)}
            >
              {n}
            </button>
          ))}
        </div>
      ) : tipo === 'calificacion' ? (
        <div className="fpub-estrellas">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className="fpub-estrellas__btn"
              onClick={() => onChange(n)}
              aria-label={`${n} estrellas`}
            >
              <i className={`bi ${Number(valor) >= n ? 'bi-star-fill' : 'bi-star'}`} />
            </button>
          ))}
        </div>
      ) : tipo === 'fecha' ? (
        <input id={id} type="date" value={valor} onChange={(e) => onChange(e.target.value)} />
      ) : tipo === 'numero' ? (
        <input id={id} type="number" value={valor} onChange={(e) => onChange(e.target.value)} />
      ) : tipo === 'email' ? (
        <input id={id} type="email" value={valor} onChange={(e) => onChange(e.target.value)} placeholder="correo@ejemplo.com" />
      ) : tipo === 'telefono' ? (
        <input id={id} type="tel" value={valor} onChange={(e) => onChange(e.target.value)} placeholder="300 000 0000" />
      ) : (
        <input id={id} type="text" value={valor} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}

// ============================================================
// Bloque de grupo repetible — una tarjeta por repetición.
// ============================================================
function GrupoRepetible({ grupo, preguntas, repeticiones, onCambiar, onAgregar, onQuitar, invalidos }) {
  const puedeQuitar = repeticiones.length > grupo.minimo_repeticiones
  const puedeAgregar = !grupo.maximo_repeticiones || repeticiones.length < grupo.maximo_repeticiones

  return (
    <div className="fpub-grupo">
      {repeticiones.map((rep, i) => (
        <div key={i} className="fpub-grupo__item">
          <div className="fpub-grupo__item-header">
            <span>{grupo.titulo_template} {i + 1}</span>
            {puedeQuitar && (
              <button type="button" className="fpub-grupo__quitar" onClick={() => onQuitar(i)}>
                <i className="bi bi-trash" /> Quitar
              </button>
            )}
          </div>
          {preguntas.map((p) => (
            <CampoPregunta
              key={p.codigo}
              pregunta={p}
              valor={rep[p.codigo] ?? ''}
              onChange={(v) => onCambiar(i, p.codigo, v)}
              invalido={invalidos.has(`${grupo.codigo}:${i}:${p.codigo}`)}
            />
          ))}
        </div>
      ))}

      {puedeAgregar && (
        <button type="button" className="fpub-grupo__agregar" onClick={onAgregar}>
          <i className="bi bi-plus-circle" /> Agregar {grupo.titulo_template.toLowerCase()}
        </button>
      )}
    </div>
  )
}

export default function FormularioPublico() {
  const { token } = useParams()

  const [formulario, setFormulario] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(null)

  const [respuestasSueltas, setRespuestasSueltas] = useState({})
  const [grupoDatos, setGrupoDatos] = useState({})
  const [invalidos, setInvalidos] = useState(new Set())
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [toast, setToast] = useState(null)

  const [paginaIdx, setPaginaIdx] = useState(0)
  const [historial, setHistorial] = useState([])

  const paginas = useMemo(
    () => formulario ? construirPaginas(construirEntradas(formulario.estructura)) : [],
    [formulario]
  )

  const { visibles, overrideDestino } = useMemo(
    () => paginas.length > 0 ? resolverPagina(paginaIdx, paginas, respuestasSueltas) : { visibles: [], overrideDestino: null },
    [paginas, paginaIdx, respuestasSueltas]
  )

  const cargar = useCallback(async () => {
    try {
      setCargando(true)
      setErrorCarga(null)
      const data = await obtenerFormularioPublico(token)
      setFormulario(data)

      const inicialGrupos = {}
      for (const g of data.estructura.grupos) {
        inicialGrupos[g.codigo] = Array.from({ length: g.minimo_repeticiones }, () => ({}))
      }
      setGrupoDatos(inicialGrupos)
      setPaginaIdx(0)
    } catch (e) {
      setErrorCarga(
        e.response?.status === 404
          ? 'Este formulario no existe o no está disponible.'
          : 'No se pudo cargar el formulario. Intenta de nuevo más tarde.'
      )
      console.error('[FormularioPublico]', e)
    } finally {
      setCargando(false)
    }
  }, [token])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount, mismo patrón que Prospectos.jsx (ver DT-018)
  useEffect(() => { cargar() }, [cargar])

  function cambiarSuelta(codigo, valor) {
    setRespuestasSueltas((prev) => ({ ...prev, [codigo]: valor }))
    setInvalidos((prev) => {
      const nuevo = new Set(prev)
      nuevo.delete(codigo)
      return nuevo
    })
  }

  function cambiarGrupo(grupoCodigo, indice, preguntaCodigo, valor) {
    setGrupoDatos((prev) => {
      const copia = [...(prev[grupoCodigo] || [])]
      copia[indice] = { ...copia[indice], [preguntaCodigo]: valor }
      return { ...prev, [grupoCodigo]: copia }
    })
    setInvalidos((prev) => {
      const nuevo = new Set(prev)
      nuevo.delete(`${grupoCodigo}:${indice}:${preguntaCodigo}`)
      return nuevo
    })
  }

  function agregarRepeticion(grupoCodigo) {
    setGrupoDatos((prev) => ({ ...prev, [grupoCodigo]: [...(prev[grupoCodigo] || []), {}] }))
  }

  function quitarRepeticion(grupoCodigo, indice) {
    setGrupoDatos((prev) => ({
      ...prev,
      [grupoCodigo]: prev[grupoCodigo].filter((_, i) => i !== indice),
    }))
  }

  // ── Valida solo lo que quedó visible en la página (lo oculto
  // por un salto en vivo no es obligatorio) ──
  function validarPaginaActual() {
    const faltantes = new Set()

    for (const entrada of visibles) {
      if (entrada.tipo === 'pregunta') {
        const p = entrada.data
        if (p.requerida && p.tipo_codigo !== 'seccion') {
          const valor = respuestasSueltas[p.codigo]
          if (valor === undefined || valor === '' || valor === null) faltantes.add(p.codigo)
        }
      } else {
        const reps = grupoDatos[entrada.codigo] || []
        reps.forEach((rep, i) => {
          entrada.preguntas.forEach((p) => {
            if (p.requerida && (rep[p.codigo] === undefined || rep[p.codigo] === '')) {
              faltantes.add(`${entrada.codigo}:${i}:${p.codigo}`)
            }
          })
        })
      }
    }

    setInvalidos(faltantes)
    return faltantes.size === 0
  }

  function resolverSiguientePagina() {
    if (overrideDestino?.tipo === 'fin') return null
    if (overrideDestino?.tipo === 'pagina') return overrideDestino.paginaIdx
    return paginaIdx < paginas.length - 1 ? paginaIdx + 1 : null
  }

  async function enviar() {
    const respuestas = { ...respuestasSueltas }
    for (const [codigo, reps] of Object.entries(grupoDatos)) {
      respuestas[codigo] = reps
    }

    try {
      setEnviando(true)
      await enviarRespuestaPublica(token, { respuestas })
      setEnviado(true)
    } catch (err) {
      const detalle = err.response?.data?.detail

      if (detalle && typeof detalle === 'object' && detalle.preguntas) {
        setInvalidos(new Set(detalle.preguntas))
        setToast({ tipo: 'error', mensaje: 'Hay respuestas inválidas o faltantes, revisa los campos marcados.' })
      } else {
        const mensajes = {
          'El formulario no existe': 'Este formulario ya no está disponible.',
          'El formulario no está activo ni publicado': 'Este formulario ya no está disponible.',
          'Demasiados envíos desde este origen, intenta más tarde': 'Demasiados intentos. Espera un momento e intenta de nuevo.',
          'Este documento ya tiene una respuesta registrada para este formulario': 'Ya registramos una respuesta con este número de documento para este formulario.',
          'El tipo de documento enviado no existe en el catálogo': 'El tipo de documento ingresado no es válido.',
        }
        setToast({ tipo: 'error', mensaje: mensajes[detalle] || detalle || 'No se pudo enviar. Intenta de nuevo.' })
      }
    } finally {
      setEnviando(false)
    }
  }

  function handleSiguiente(e) {
    e.preventDefault()
    if (!validarPaginaActual()) {
      setToast({ tipo: 'error', mensaje: 'Completa los campos obligatorios marcados en rojo.' })
      return
    }

    const siguiente = resolverSiguientePagina()
    if (siguiente === null) {
      enviar()
    } else {
      setHistorial((prev) => [...prev, paginaIdx])
      setPaginaIdx(siguiente)
    }
  }

  function handleAtras() {
    setHistorial((prev) => {
      if (prev.length === 0) return prev
      const copia = [...prev]
      setPaginaIdx(copia.pop())
      return copia
    })
  }

  if (cargando) {
    return (
      <div className="fpub-pagina">
        <div className="fpub-tarjeta fpub-tarjeta--centrada">
          <div className="fpub-spinner" />
        </div>
      </div>
    )
  }

  if (errorCarga) {
    return (
      <div className="fpub-pagina">
        <div className="fpub-tarjeta fpub-tarjeta--centrada">
          <i className="bi bi-exclamation-circle fpub-icono-error" />
          <p>{errorCarga}</p>
        </div>
      </div>
    )
  }

  if (enviado) {
    return (
      <div className="fpub-pagina">
        <div className="fpub-tarjeta fpub-tarjeta--centrada">
          <i className="bi bi-check-circle-fill fpub-icono-exito" />
          <h2>¡Gracias!</h2>
          <p>Tu respuesta fue registrada correctamente.</p>
        </div>
      </div>
    )
  }

  const pagina = paginas[paginaIdx]
  const esUltimaPagina = resolverSiguientePagina() === null
  const progreso = paginas.length > 0 ? ((paginaIdx + 1) / paginas.length) * 100 : 0

  return (
    <div className="fpub-pagina">
      <form className="fpub-tarjeta" onSubmit={handleSiguiente}>
        <div className="fpub-progreso">
          <div className="fpub-progreso__barra" style={{ width: `${progreso}%` }} />
        </div>

        <h1 className="fpub-titulo">{formulario.titulo}</h1>
        {formulario.descripcion && <p className="fpub-descripcion">{formulario.descripcion}</p>}

        {pagina?.titulo && (
          <div className="fpub-seccion">
            <h2>{pagina.titulo}</h2>
            {pagina.subtitulo && <p>{pagina.subtitulo}</p>}
          </div>
        )}

        {visibles.map((entrada) => entrada.tipo === 'pregunta' ? (
          <CampoPregunta
            key={entrada.codigo}
            pregunta={entrada.data}
            valor={respuestasSueltas[entrada.data.codigo] ?? ''}
            onChange={(v) => cambiarSuelta(entrada.data.codigo, v)}
            invalido={invalidos.has(entrada.data.codigo)}
          />
        ) : (
          <div key={entrada.codigo} className="fpub-grupo-bloque">
            <h2 className="fpub-grupo-bloque__titulo"><i className="bi bi-collection" /> {entrada.data.titulo_template}</h2>
            <GrupoRepetible
              grupo={entrada.data}
              preguntas={entrada.preguntas}
              repeticiones={grupoDatos[entrada.codigo] || []}
              onCambiar={(i, codigo, v) => cambiarGrupo(entrada.codigo, i, codigo, v)}
              onAgregar={() => agregarRepeticion(entrada.codigo)}
              onQuitar={(i) => quitarRepeticion(entrada.codigo, i)}
              invalidos={invalidos}
            />
          </div>
        ))}

        <div className="fpub-navegacion">
          {historial.length > 0 ? (
            <button type="button" className="fpub-atras" onClick={handleAtras}>
              <i className="bi bi-arrow-left" /> Atrás
            </button>
          ) : <span />}
          <button type="submit" className="fpub-enviar" disabled={enviando}>
            {enviando ? 'Enviando…' : esUltimaPagina ? 'Enviar' : 'Siguiente'}
          </button>
        </div>
      </form>

      <Toast toast={toast} onCerrar={() => setToast(null)} />
    </div>
  )
}
