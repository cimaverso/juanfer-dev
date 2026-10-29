// ============================================================
// src/pages/formularios/PreguntaCard.jsx
// Tarjeta de pregunta del builder — estilo Microsoft Forms: siempre
// editable, sin "Guardar"/"Cancelar". "Más opciones" esconde lo
// avanzado (grupo, vínculo a cliente, código interno) para no saturar.
// Extraído de FormularioBuilder.jsx (que ya estaba al límite de 1000
// líneas, ver CLAUDE.md).
// ============================================================

import { useState, useEffect } from 'react'

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
  { value: 'ocupacion', label: 'Ocupación', tipoForzado: 'opcion' },
  { value: 'ubicacion', label: 'Ubicación (país, depto y ciudad)', tipoForzado: 'texto' },
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

export default function PreguntaCard({ pregunta, grupos, pasos, tiposPregunta, tiposDocumento, esPrimera, esUltima, onGuardar, onEliminar, onDuplicar, onMover, numero }) {
  const [titulo, setTitulo] = useState(pregunta.titulo)
  const [subtitulo, setSubtitulo] = useState(pregunta.subtitulo || '')
  const [choices, setChoices] = useState(pregunta.configuracion?.choices || [])
  const [branching, setBranching] = useState(pregunta.configuracion?.branching || {})
  const [multiple, setMultiple] = useState(pregunta.configuracion?.multiple || false)
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
    onGuardar({ configuracion: { choices: limpias, branching: branchingLimpio, multiple } })
  }

  function guardarBranching(opcion, destino) {
    const nuevo = { ...branching }
    if (destino) nuevo[opcion] = destino
    else delete nuevo[opcion]
    setBranching(nuevo)
    onGuardar({ configuracion: { choices: choices.filter((c) => c.trim() !== ''), branching: nuevo, multiple } })
  }

  // Selección múltiple y saltos condicionales son incompatibles: el
  // público enviaría un array como valor, pero "branching" usa ese
  // valor como llave de un dict {opcion: codigo_destino} (ver
  // FormularioPublico.jsx) -- por eso se limpia el branching al activar
  // selección múltiple, en vez de dejar saltos que nunca se van a
  // disparar.
  function guardarMultiple(nuevoMultiple) {
    const branchingNuevo = nuevoMultiple ? {} : branching
    setMultiple(nuevoMultiple)
    setBranching(branchingNuevo)
    onGuardar({
      configuracion: {
        choices: choices.filter((c) => c.trim() !== ''),
        branching: branchingNuevo,
        multiple: nuevoMultiple,
      },
    })
  }

  return (
    <div className="formbuilder__pcard">
      <div className="formbuilder__pcard-barra">
        {numero != null && <span className="formbuilder__pcard-numero" title="Número con el que la verá quien responda">{numero}</span>}

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
          <label className="formbuilder__switch-label" title={campoVinculado ? `Fija en selección única: vinculada a "${campoVinculado.label}" del cliente, que solo guarda un valor` : undefined}>
            <button
              className={`formbuilder__switch ${multiple ? 'formbuilder__switch--on' : ''}`}
              onClick={() => guardarMultiple(!multiple)}
              disabled={Boolean(campoVinculado)}
            >
              <span className="formbuilder__switch-bola" />
            </button>
            Permitir selección múltiple
          </label>

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

          {!multiple && choices.filter((c) => c.trim() !== '').length > 0 && (
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
