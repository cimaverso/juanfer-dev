// ============================================================
// src/api/importExport.js
// CORRECCIÓN BUG #3 — Export SheetJS
// Cambio: exportarAExcel ahora espera a que window.XLSX esté
// disponible antes de ejecutar. Si no carga en 5s, avisa.
// El resto del archivo es idéntico al original.
// ============================================================

import api from "./axios"

const COLUMNAS = {
  'MES':                                  'fecha_solicitud',
  'CEDULA':                               'cliente_documento',
  'TIPO DE DOCUMENTO':                    'tipo_documento',
  'NOMBRE COMPLETO TOMADOR Y ASEGURADO':  'nombre_completo',
  'ASEGURADORA':                          'aseguradora',
  '# DE POLIZA':                          'numero_poliza',
  'CELULAR':                              'celular',
  'FECHA EXPEDICIÓN':                     'fecha_expedicion',
  'FECHA EXPEDICION':                     'fecha_expedicion',
  'SOLUCIONES':                           'soluciones_raw',
  'ESTADO':                               'estado',
  'PRIMA':                                'prima',
  'RESPONSABLE':                          'responsable_nombre',
  'OBSERVACION':                          'observacion',
  'OBSERVACIÓN':                          'observacion',
}

function norm(str) {
  return String(str || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function parsearFecha(valor) {
  if (!valor) return ''
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor
  if (typeof valor === 'number') {
    return new Date((valor - 25569) * 86400 * 1000).toISOString().split('T')[0]
  }
  if (valor instanceof Date) return valor.toISOString().split('T')[0]
  if (typeof valor === 'string') {
    const partes = valor.split(/[\/\-\.]/)
    if (partes.length === 3) {
      const [a, b, c] = partes
      if (c.length === 4) return `${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`
      if (a.length === 4) return `${a}-${b.padStart(2,'0')}-${c.padStart(2,'0')}`
    }
  }
  return ''
}

function parsearPrima(valor) {
  if (!valor) return null
  const num = parseFloat(String(valor).replace(/[$\s.,]/g, '').replace(',', ''))
  return isNaN(num) ? null : num
}

function parsearSoluciones(valor) {
  if (!valor) return { producto: '', ramo: '' }
  const str = String(valor).trim()
  for (const sep of ['/', '|', ' - ', '\n']) {
    if (str.includes(sep)) {
      const [prod, ramo] = str.split(sep).map(s => s.trim())
      return { producto: prod || '', ramo: ramo || '' }
    }
  }
  return { producto: str, ramo: '' }
}

function validarFila(fila) {
  const errores = []
  if (!fila.cliente_documento) errores.push('Cédula vacía')
  if (!fila.nombre_completo)   errores.push('Nombre vacío')
  if (fila.prima !== null && fila.prima <= 0) errores.push('Prima debe ser positiva')
  if (fila.fecha_solicitud && fila.fecha_expedicion) {
    if (new Date(fila.fecha_expedicion) < new Date(fila.fecha_solicitud))
      errores.push('Fecha expedición anterior a solicitud')
  }
  return errores
}

// ── Helper: espera a que window.XLSX esté disponible ─────
// Reintenta cada 100ms hasta timeout (default 5s)
function esperarXLSX(timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    if (window.XLSX) { resolve(window.XLSX); return }
    const inicio   = Date.now()
    const intervalo = setInterval(() => {
      if (window.XLSX) {
        clearInterval(intervalo)
        resolve(window.XLSX)
      } else if (Date.now() - inicio > timeoutMs) {
        clearInterval(intervalo)
        reject(new Error('SheetJS no se cargó. Recarga la página e intenta de nuevo.'))
      }
    }, 100)
  })
}

// ── Cargar SheetJS dinámicamente si no está presente ─────
// Llamar desde cualquier componente que necesite XLSX.
// Devuelve una Promise que resuelve cuando el script está listo.
export function cargarSheetJS() {
  if (window.XLSX) return Promise.resolve(window.XLSX)
  return new Promise((resolve, reject) => {
    const existente = document.querySelector(
      'script[src*="xlsx.full.min"]'
    )
    if (existente) {
      // Ya se está cargando — esperar
      esperarXLSX().then(resolve).catch(reject)
      return
    }
    const script  = document.createElement('script')
    script.src    = 'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js'
    script.async  = true
    script.onload = () => resolve(window.XLSX)
    script.onerror = () => reject(new Error('No se pudo cargar SheetJS desde CDN'))
    document.body.appendChild(script)
  })
}

// ============================================================
// PARSEAR ARCHIVO DE IMPORTACIÓN
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
        const workbook   = window.XLSX.read(e.target.result, { type: 'binary', cellDates: true })
        const hoja       = workbook.Sheets[workbook.SheetNames[0]]
        const filasCrudas = window.XLSX.utils.sheet_to_json(hoja, { raw: false, defval: '' })

        if (filasCrudas.length === 0) {
          resolve({ validas: [], conErrores: [], total: 0 })
          return
        }

        const validas    = []
        const conErrores = []

        filasCrudas.forEach((filaCruda, idx) => {
          const fila = {}
          Object.entries(filaCruda).forEach(([col, valor]) => {
            const campo = Object.entries(COLUMNAS).find(
              ([k]) => norm(k) === norm(col)
            )?.[1]
            if (campo) fila[campo] = valor
          })

          fila.fecha_solicitud    = parsearFecha(fila.fecha_solicitud)
          fila.fecha_expedicion   = parsearFecha(fila.fecha_expedicion)
          fila.prima              = parsearPrima(fila.prima)
          fila.cliente_documento  = String(fila.cliente_documento || '').trim()
          fila.nombre_completo    = String(fila.nombre_completo   || '').trim()
          fila.estado             = String(fila.estado            || '').trim()
          fila.responsable_nombre = String(fila.responsable_nombre|| '').trim()
          fila.observacion        = String(fila.observacion       || '').trim()
          fila.numero_poliza      = String(fila.numero_poliza     || '').trim() || null
          fila.celular            = String(fila.celular           || '').trim()

          const { producto, ramo } = parsearSoluciones(fila.soluciones_raw)
          fila.producto = producto
          fila.ramo     = ramo
          delete fila.soluciones_raw
          fila._fila    = idx + 2

          const erroresFila = validarFila(fila)
          if (erroresFila.length > 0) {
            conErrores.push({ ...fila, _errores: erroresFila })
          } else {
            validas.push(fila)
          }
        })

        resolve({ validas, conErrores, total: filasCrudas.length })
      } catch (err) {
        reject(new Error('Error al leer el archivo: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsBinaryString(archivo)
  })
}

// ============================================================
// EXPORTAR A EXCEL
// CORRECCIÓN: usa esperarXLSX() — ya no falla si SheetJS
// no terminó de cargar cuando el usuario hace clic.
// ============================================================
export async function exportarAExcel(polizas, nombreArchivo = 'polizas_juanfer') {
  // Espera hasta 5s a que SheetJS esté disponible
  const XLSX = await esperarXLSX().catch((err) => {
    alert(err.message)
    return null
  })
  if (!XLSX) return

  const filas = polizas.map(p => ({
    'MES':                                  p.fecha_solicitud  || '',
    'CEDULA':                               p.cliente_documento|| '',
    'TIPO DE DOCUMENTO':                    p.tipo_documento   || '',
    'NOMBRE COMPLETO TOMADOR Y ASEGURADO':  p.cliente_nombre   || '',
    'ASEGURADORA':                          p.aseguradora      || '',
    '# DE POLIZA':                          p.numero_poliza    || '',
    'CELULAR':                              p.cliente_celular  || '',
    'FECHA EXPEDICIÓN':                     p.fecha_expedicion || '',
    'SOLUCIONES': p.producto
      ? `${p.producto}${p.ramo ? ' / ' + p.ramo : ''}`
      : '',
    'ESTADO':                               p.estado           || '',
    'PRIMA':                                p.prima            || '',
    'RESPONSABLE':                          p.responsable_nombre|| '',
    'OBSERVACION':                          p.observacion      || '',
  }))

  const wb  = XLSX.utils.book_new()
  const ws  = XLSX.utils.json_to_sheet(filas)
  ws['!cols'] = [
    { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 35 },
    { wch: 30 }, { wch: 20 }, { wch: 14 }, { wch: 16 },
    { wch: 30 }, { wch: 25 }, { wch: 14 }, { wch: 20 }, { wch: 40 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Pólizas')

  const fecha = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `${nombreArchivo}_${fecha}.xlsx`)
}

// ============================================================
// DESCARGAR PLANTILLA
// CORRECCIÓN: misma lógica async con esperarXLSX()
// ============================================================
export async function descargarPlantilla() {
  const XLSX = await esperarXLSX().catch((err) => {
    alert(err.message)
    return null
  })
  if (!XLSX) return

  const plantilla = [{
    'MES':                                  '2025-03-01',
    'CEDULA':                               '1098234567',
    'TIPO DE DOCUMENTO':                    'CC',
    'NOMBRE COMPLETO TOMADOR Y ASEGURADO':  'María Fernanda Gómez',
    'ASEGURADORA':                          'Aria',
    '# DE POLIZA':                          'SUV-2025-001234',
    'CELULAR':                              '3012345678',
    'FECHA EXPEDICIÓN':                     '2025-03-08',
    'SOLUCIONES':                           'Plan Vive / Salud Familiar',
    'ESTADO':                               'Expedido',
    'PRIMA':                                '285000',
    'RESPONSABLE':                          'Gina López',
    'OBSERVACION':                          'Ejemplo de fila — eliminar antes de importar',
  }]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(plantilla)
  ws['!cols'] = [
    { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 35 },
    { wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 30 },
    { wch: 25 }, { wch: 14 }, { wch: 20 }, { wch: 40 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
  XLSX.writeFile(wb, 'plantilla_importacion_juanfer.xlsx')
}

// ============================================================
// IMPORTAR AL BACKEND
// ============================================================
export async function importarPolizasExcel(file) {
  const formData = new FormData()
  formData.append('archivo', file)
  const { data } = await api.post('/polizas/importar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}