// ============================================================
// pages/produccion/ImportarPolizas.jsx
// Modal de importación masiva de pólizas desde Excel
// Flujo: subir → validar → preview → confirmar → importar
// ============================================================

import { useState, useRef, useEffect } from 'react'
import { parsearArchivoImportacion, descargarPlantilla } from '../../api/importExport.js'
import { crearPoliza } from '../../api/polizas.js'
import './ImportarPolizas.css'

// ── Cargar SheetJS desde CDN ──────────────────────────────
function cargarSheetJS() {
  return new Promise((resolve, reject) => {
    if (window.XLSX) { resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    script.onload  = resolve
    script.onerror = () => reject(new Error('No se pudo cargar SheetJS'))
    document.head.appendChild(script)
  })
}

// ── Estados del flujo ─────────────────────────────────────
const PASO = {
  INICIO:     'inicio',
  VALIDANDO:  'validando',
  PREVIEW:    'preview',
  IMPORTANDO: 'importando',
  RESULTADO:  'resultado',
}

export default function ImportarPolizas({ onCerrar, onImportado }) {
  const [paso, setPaso]               = useState(PASO.INICIO)
  const [archivo, setArchivo]         = useState(null)
  const [validas, setValidas]         = useState([])
  const [conErrores, setConErrores]   = useState([])
  const [total, setTotal]             = useState(0)
  const [progreso, setProgreso]       = useState(0)
  const [importadas, setImportadas]   = useState(0)
  const [errorGlobal, setErrorGlobal] = useState(null)
  const [verErrores, setVerErrores]   = useState(false)
  const inputRef = useRef()

  // Cargar SheetJS al montar
  useEffect(() => {
    cargarSheetJS().catch(err => setErrorGlobal(err.message))
  }, [])

  // ── Seleccionar archivo ───────────────────────────────
  const handleArchivo = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setErrorGlobal('Formato no soportado. Usa .xlsx, .xls o .csv')
      return
    }

    setArchivo(file)
    setErrorGlobal(null)
    setPaso(PASO.VALIDANDO)

    try {
      await cargarSheetJS()
      const resultado = await parsearArchivoImportacion(file)
      setValidas(resultado.validas)
      setConErrores(resultado.conErrores)
      setTotal(resultado.total)
      setPaso(PASO.PREVIEW)
    } catch (err) {
      setErrorGlobal(err.message)
      setPaso(PASO.INICIO)
    }
  }

  // ── Confirmar importación ─────────────────────────────
  const confirmarImportacion = async () => {
    if (validas.length === 0) return
    setPaso(PASO.IMPORTANDO)
    setProgreso(0)

    let importadasCount = 0

    for (let i = 0; i < validas.length; i++) {
      try {
        await crearPoliza(validas[i])
        importadasCount++
      } catch {
        // Fila fallida — continuar con las demás
      }
      setProgreso(Math.round(((i + 1) / validas.length) * 100))
    }

    setImportadas(importadasCount)
    setPaso(PASO.RESULTADO)
  }

  // ── Reiniciar ─────────────────────────────────────────
  const reiniciar = () => {
    setPaso(PASO.INICIO)
    setArchivo(null)
    setValidas([])
    setConErrores([])
    setTotal(0)
    setProgreso(0)
    setErrorGlobal(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="importar-overlay" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="importar-modal">

        {/* ── Header ──────────────────────────────────── */}
        <div className="importar-header">
          <div className="importar-header__titulo">
            <i className="bi bi-file-earmark-arrow-up" />
            <h2>Importar pólizas</h2>
          </div>
          <button className="importar-header__cerrar" onClick={onCerrar}>
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* ── Cuerpo ──────────────────────────────────── */}
        <div className="importar-cuerpo">

          {/* Error global */}
          {errorGlobal && (
            <div className="importar-error-global">
              <i className="bi bi-exclamation-triangle" />
              {errorGlobal}
            </div>
          )}

          {/* ── PASO: INICIO ──────────────────────────── */}
          {paso === PASO.INICIO && (
            <div className="importar-inicio">
              <div
                className="importar-dropzone"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const file = e.dataTransfer.files?.[0]
                  if (file) {
                    inputRef.current.files = e.dataTransfer.files
                    handleArchivo({ target: { files: e.dataTransfer.files } })
                  }
                }}
              >
                <i className="bi bi-cloud-upload" />
                <p className="importar-dropzone__texto">
                  Arrastra tu archivo aquí o <span>haz clic para seleccionar</span>
                </p>
                <p className="importar-dropzone__hint">
                  Formatos aceptados: .xlsx, .xls, .csv
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleArchivo}
                  style={{ display: 'none' }}
                />
              </div>

              <div className="importar-info">
                <div className="importar-info__item">
                  <i className="bi bi-info-circle" />
                  <span>El archivo debe tener las mismas columnas del Excel actual</span>
                </div>
                <div className="importar-info__item">
                  <i className="bi bi-shield-check" />
                  <span>Se valida cada fila antes de importar — los errores no se importan</span>
                </div>
                <div className="importar-info__item">
                  <i className="bi bi-person-check" />
                  <span>Si el cliente ya existe (misma cédula) no se duplica</span>
                </div>
              </div>

              <button
                className="importar-btn-plantilla"
                onClick={descargarPlantilla}
              >
                <i className="bi bi-download" />
                Descargar plantilla de importación
              </button>
            </div>
          )}

          {/* ── PASO: VALIDANDO ───────────────────────── */}
          {paso === PASO.VALIDANDO && (
            <div className="importar-cargando">
              <div className="spinner" />
              <p>Validando archivo...</p>
              <span>{archivo?.name}</span>
            </div>
          )}

          {/* ── PASO: PREVIEW ─────────────────────────── */}
          {paso === PASO.PREVIEW && (
            <div className="importar-preview">

              {/* Resumen */}
              <div className="importar-resumen">
                <div className="importar-resumen__item importar-resumen__item--total">
                  <span className="importar-resumen__num">{total}</span>
                  <span className="importar-resumen__label">filas leídas</span>
                </div>
                <div className="importar-resumen__item importar-resumen__item--ok">
                  <span className="importar-resumen__num">{validas.length}</span>
                  <span className="importar-resumen__label">válidas</span>
                </div>
                <div className={`importar-resumen__item ${conErrores.length > 0 ? 'importar-resumen__item--error' : 'importar-resumen__item--ok'}`}>
                  <span className="importar-resumen__num">{conErrores.length}</span>
                  <span className="importar-resumen__label">con errores</span>
                </div>
              </div>

              {/* Filas con errores */}
              {conErrores.length > 0 && (
                <div className="importar-errores">
                  <button
                    className="importar-errores__toggle"
                    onClick={() => setVerErrores(!verErrores)}
                  >
                    <i className={`bi bi-chevron-${verErrores ? 'up' : 'down'}`} />
                    {verErrores ? 'Ocultar' : 'Ver'} filas con errores ({conErrores.length})
                  </button>

                  {verErrores && (
                    <div className="importar-errores__lista">
                      {conErrores.map((fila, idx) => (
                        <div key={idx} className="importar-errores__fila">
                          <span className="importar-errores__num">Fila {fila._fila}</span>
                          <span className="importar-errores__nombre">
                            {fila.nombre_completo || fila.cliente_documento || 'Sin datos'}
                          </span>
                          <span className="importar-errores__msg">
                            {fila._errores.join(' · ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Preview de primeras filas válidas */}
              {validas.length > 0 && (
                <div className="importar-tabla-wrap">
                  <p className="importar-tabla-label">
                    Vista previa — primeras {Math.min(5, validas.length)} de {validas.length} filas válidas:
                  </p>
                  <table className="importar-tabla">
                    <thead>
                      <tr>
                        <th>Cédula</th>
                        <th>Nombre</th>
                        <th>Estado</th>
                        <th>F. Solicitud</th>
                        <th>Prima</th>
                        <th>Responsable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validas.slice(0, 5).map((fila, idx) => (
                        <tr key={idx}>
                          <td>{fila.cliente_documento}</td>
                          <td>{fila.nombre_completo}</td>
                          <td>{fila.estado}</td>
                          <td>{fila.fecha_solicitud}</td>
                          <td>{fila.prima ? `$${Number(fila.prima).toLocaleString('es-CO')}` : '—'}</td>
                          <td>{fila.responsable_nombre}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {validas.length === 0 && (
                <div className="importar-sin-validas">
                  <i className="bi bi-exclamation-circle" />
                  <p>No hay filas válidas para importar. Revisa los errores y corrige el archivo.</p>
                </div>
              )}
            </div>
          )}

          {/* ── PASO: IMPORTANDO ──────────────────────── */}
          {paso === PASO.IMPORTANDO && (
            <div className="importar-progreso">
              <i className="bi bi-cloud-arrow-up" />
              <p>Importando {validas.length} pólizas...</p>
              <div className="importar-progreso__barra-wrap">
                <div
                  className="importar-progreso__barra"
                  style={{ width: `${progreso}%` }}
                />
              </div>
              <span className="importar-progreso__pct">{progreso}%</span>
            </div>
          )}

          {/* ── PASO: RESULTADO ───────────────────────── */}
          {paso === PASO.RESULTADO && (
            <div className="importar-resultado">
              <div className="importar-resultado__icono">
                <i className="bi bi-check-circle-fill" />
              </div>
              <h3>Importación completada</h3>
              <p>
                <strong>{importadas}</strong> póliza{importadas !== 1 ? 's' : ''} importada{importadas !== 1 ? 's' : ''} correctamente
                {conErrores.length > 0 && ` · ${conErrores.length} filas omitidas por errores`}
              </p>
            </div>
          )}

        </div>

        {/* ── Footer con acciones ──────────────────────── */}
        <div className="importar-footer">
          {paso === PASO.INICIO && (
            <button className="btn-secundario" onClick={onCerrar}>
              Cancelar
            </button>
          )}

          {paso === PASO.PREVIEW && (
            <>
              <button className="btn-secundario" onClick={reiniciar}>
                <i className="bi bi-arrow-left" /> Cambiar archivo
              </button>
              <button
                className="btn-primario"
                onClick={confirmarImportacion}
                disabled={validas.length === 0}
              >
                <i className="bi bi-cloud-arrow-up" />
                Importar {validas.length} póliza{validas.length !== 1 ? 's' : ''}
              </button>
            </>
          )}

          {paso === PASO.RESULTADO && (
            <>
              <button className="btn-secundario" onClick={reiniciar}>
                Importar otro archivo
              </button>
              <button className="btn-primario" onClick={() => { onImportado(); onCerrar() }}>
                <i className="bi bi-check-lg" /> Listo
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}