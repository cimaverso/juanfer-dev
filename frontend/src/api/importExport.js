// ============================================================
// api/importExport.js
// Importación y exportación de pólizas con SheetJS
// Sin backend — todo corre en el navegador
//
// COLUMNAS ESPERADAS EN EL EXCEL:
//   MES | CEDULA | TIPO DE DOCUMENTO | NOMBRE COMPLETO TOMADOR Y ASEGURADO
//   # DE POLIZA | CELULAR | FECHA EXPEDICIÓN | SOLUCIONES | ESTADO
//   PRIMA | RESPONSABLE | OBSERVACION
// ============================================================

// SheetJS se carga vía CDN en el componente que lo usa.
// Esta función asume que window.XLSX está disponible.

// ── Mapeo de columnas Excel → campos del sistema ──────────
const COLUMNAS = {
  'MES':                                  'fecha_solicitud',
  'CEDULA':                               'cliente_documento',
  'TIPO DE DOCUMENTO':                    'tipo_documento',
  'NOMBRE COMPLETO TOMADOR Y ASEGURADO':  'nombre_completo',
  '# DE POLIZA':                          'numero_poliza',
  'CELULAR':                              'celular',
  'FECHA EXPEDICIÓN':                     'fecha_expedicion',
  'FECHA EXPEDICION':                     'fecha_expedicion', // sin tilde
  'SOLUCIONES':                           'soluciones_raw',   // se procesa aparte
  'ESTADO':                               'estado',
  'PRIMA':                                'prima',
  'RESPONSABLE':                          'responsable_nombre',
  'OBSERVACION':                          'observacion',
  'OBSERVACIÓN':                          'observacion',      // con tilde
}

// ── Normalizar texto para comparación robusta ─────────────
function norm(str) {
  return String(str || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

// ── Parsear fecha desde Excel ─────────────────────────────
// Excel puede traer fechas como número serial, string o Date
function parsearFecha(valor) {
  if (!valor) return ''

  // Si ya es string con formato YYYY-MM-DD
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return valor
  }

  // Si es número serial de Excel (días desde 1900-01-01)
  if (typeof valor === 'number') {
    const fecha = new Date((valor - 25569) * 86400 * 1000)
    return fecha.toISOString().split('T')[0]
  }

  // Si es objeto Date
  if (valor instanceof Date) {
    return valor.toISOString().split('T')[0]
  }

  // String con formato DD/MM/YYYY o similar
  if (typeof valor === 'string') {
    const partes = valor.split(/[\/\-\.]/)
    if (partes.length === 3) {
      // Detectar si es DD/MM/YYYY o MM/DD/YYYY
      const [a, b, c] = partes
      if (c.length === 4) return `${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`
      if (a.length === 4) return `${a}-${b.padStart(2,'0')}-${c.padStart(2,'0')}`
    }
  }

  return ''
}

// ── Parsear prima ─────────────────────────────────────────
function parsearPrima(valor) {
  if (!valor) return null
  const limpio = String(valor).replace(/[$\s.,]/g, '').replace(',', '')
  const num = parseFloat(limpio)
  return isNaN(num) ? null : num
}

// ── Parsear SOLUCIONES → producto + ramo ──────────────────
// El campo viene como "Plan Vive / Salud Familiar" o similar
function parsearSoluciones(valor) {
  if (!valor) return { producto: '', ramo: '' }
  const str = String(valor).trim()

  // Separadores posibles: /, |, -, \n
  const separadores = ['/', '|', ' - ', '\n']
  for (const sep of separadores) {
    if (str.includes(sep)) {
      const [prod, ramo] = str.split(sep).map(s => s.trim())
      return { producto: prod || '', ramo: ramo || '' }
    }
  }

  // Sin separador: asumimos que es solo producto
  return { producto: str, ramo: '' }
}

// ── Validar una fila ──────────────────────────────────────
function validarFila(fila, numeroFila) {
  const errores = []

  if (!fila.cliente_documento)
    errores.push('Cédula vacía')

  if (!fila.nombre_completo)
    errores.push('Nombre vacío')

  if (fila.prima !== null && fila.prima <= 0)
    errores.push('Prima debe ser positiva')

  if (fila.fecha_solicitud && fila.fecha_expedicion) {
    if (new Date(fila.fecha_expedicion) < new Date(fila.fecha_solicitud))
      errores.push('Fecha expedición anterior a solicitud')
  }

  return errores
}

// ============================================================
// IMPORTAR — lee el archivo y devuelve { validas, errores }
// ============================================================
export function parsearArchivoImportacion(archivo) {
  return new Promise((resolve, reject) => {
    if (!window.XLSX) {
      reject(new Error('SheetJS no está cargado'))
      return
    }

    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const workbook = window.XLSX.read(e.target.result, {
          type: 'binary',
          cellDates: true,
        })

        // Tomar la primera hoja
        const hoja = workbook.Sheets[workbook.SheetNames[0]]
        const filasCrudas = window.XLSX.utils.sheet_to_json(hoja, {
          raw: false,
          defval: '',
        })

        if (filasCrudas.length === 0) {
          resolve({ validas: [], conErrores: [], total: 0 })
          return
        }

        const validas    = []
        const conErrores = []

        filasCrudas.forEach((filaCruda, idx) => {
          const numeroFila = idx + 2 // +2 porque fila 1 es encabezado

          // Mapear columnas usando normalización
          const fila = {}
          Object.entries(filaCruda).forEach(([col, valor]) => {
            const colNorm = norm(col)
            // Buscar en el mapeo normalizando también las claves
            const campo = Object.entries(COLUMNAS).find(
              ([k]) => norm(k) === colNorm
            )?.[1]
            if (campo) fila[campo] = valor
          })

          // Procesar campos especiales
          fila.fecha_solicitud  = parsearFecha(fila.fecha_solicitud)
          fila.fecha_expedicion = parsearFecha(fila.fecha_expedicion)
          fila.prima            = parsearPrima(fila.prima)
          fila.cliente_documento = String(fila.cliente_documento || '').trim()
          fila.nombre_completo   = String(fila.nombre_completo || '').trim()
          fila.estado            = String(fila.estado || '').trim()
          fila.responsable_nombre = String(fila.responsable_nombre || '').trim()
          fila.observacion       = String(fila.observacion || '').trim()
          fila.numero_poliza     = String(fila.numero_poliza || '').trim() || null
          fila.celular           = String(fila.celular || '').trim()

          // Parsear SOLUCIONES
          const { producto, ramo } = parsearSoluciones(fila.soluciones_raw)
          fila.producto = producto
          fila.ramo     = ramo
          delete fila.soluciones_raw

          // Añadir número de fila para referencia en errores
          fila._fila = numeroFila

          // Validar
          const erroresFila = validarFila(fila, numeroFila)
          if (erroresFila.length > 0) {
            conErrores.push({ ...fila, _errores: erroresFila })
          } else {
            validas.push(fila)
          }
        })

        resolve({
          validas,
          conErrores,
          total: filasCrudas.length,
        })
      } catch (err) {
        reject(new Error('Error al leer el archivo: ' + err.message))
      }
    }

    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsBinaryString(archivo)
  })
}

// ============================================================
// EXPORTAR — genera y descarga un Excel con los datos
// polizas: array de pólizas ya filtradas
// ============================================================
export function exportarAExcel(polizas, nombreArchivo = 'polizas_juanfer') {
  if (!window.XLSX) {
    alert('Error: SheetJS no está disponible')
    return
  }

  // Mapear al formato del Excel original
  const filas = polizas.map(p => ({
    'MES':                                  p.fecha_solicitud || '',
    'CEDULA':                               p.cliente_documento || '',
    'TIPO DE DOCUMENTO':                    p.tipo_documento || 'CC',
    'NOMBRE COMPLETO TOMADOR Y ASEGURADO':  p.cliente_nombre || '',
    '# DE POLIZA':                          p.numero_poliza || '',
    'CELULAR':                              p.cliente_celular || '',
    'FECHA EXPEDICIÓN':                     p.fecha_expedicion || '',
    'SOLUCIONES':                           p.producto
                                              ? `${p.producto}${p.ramo ? ' / ' + p.ramo : ''}`
                                              : '',
    'ESTADO':                               p.estado || '',
    'PRIMA':                                p.prima || '',
    'RESPONSABLE':                          p.responsable_nombre || '',
    'OBSERVACION':                          p.observacion || '',
  }))

  const wb   = window.XLSX.utils.book_new()
  const ws   = window.XLSX.utils.json_to_sheet(filas)

  // Ancho de columnas
  ws['!cols'] = [
    { wch: 12 }, // MES
    { wch: 15 }, // CEDULA
    { wch: 18 }, // TIPO DE DOCUMENTO
    { wch: 35 }, // NOMBRE
    { wch: 20 }, // # DE POLIZA
    { wch: 14 }, // CELULAR
    { wch: 16 }, // FECHA EXPEDICIÓN
    { wch: 30 }, // SOLUCIONES
    { wch: 25 }, // ESTADO
    { wch: 14 }, // PRIMA
    { wch: 20 }, // RESPONSABLE
    { wch: 40 }, // OBSERVACION
  ]

  window.XLSX.utils.book_append_sheet(wb, ws, 'Pólizas')

  // Descargar
  const fecha  = new Date().toISOString().slice(0, 10)
  window.XLSX.writeFile(wb, `${nombreArchivo}_${fecha}.xlsx`)
}

// ============================================================
// DESCARGAR PLANTILLA — Excel vacío con las columnas correctas
// Para que el equipo lo llene y luego importe
// ============================================================
export function descargarPlantilla() {
  if (!window.XLSX) {
    alert('Error: SheetJS no está disponible')
    return
  }

  const plantilla = [{
    'MES':                                  '2025-03-01',
    'CEDULA':                               '1098234567',
    'TIPO DE DOCUMENTO':                    'CC',
    'NOMBRE COMPLETO TOMADOR Y ASEGURADO':  'María Fernanda Gómez',
    '# DE POLIZA':                          'SUV-2025-001234',
    'CELULAR':                              '3012345678',
    'FECHA EXPEDICIÓN':                     '2025-03-08',
    'SOLUCIONES':                           'Plan Vive / Salud Familiar',
    'ESTADO':                               'Expedido',
    'PRIMA':                                '285000',
    'RESPONSABLE':                          'Gina López',
    'OBSERVACION':                          'Ejemplo de fila — eliminar antes de importar',
  }]

  const wb = window.XLSX.utils.book_new()
  const ws = window.XLSX.utils.json_to_sheet(plantilla)

  ws['!cols'] = [
    { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 35 },
    { wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 30 },
    { wch: 25 }, { wch: 14 }, { wch: 20 }, { wch: 40 },
  ]

  window.XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
  window.XLSX.writeFile(wb, 'plantilla_importacion_juanfer.xlsx')
}