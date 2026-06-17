// ============================================================
// src/api/prospectos.js
// M3 — Prospectos / Pipeline
// Patrón mock-first: VITE_USE_MOCK=true → datos locales
//                    VITE_USE_MOCK=false → FastAPI real
// Sammy: el backend debe respetar exactamente el shape de
// los objetos mock definidos en MOCK_PROSPECTOS abajo.
// ============================================================

import axiosInstance from './axios.js'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// ── Semáforo de estados del pipeline ─────────────────────
// Debe coincidir con los valores en tabla estado_prospecto
export const ESTADOS_PIPELINE = [
  { id: 1, nombre: 'Primer contacto',     color: 'contacto-1',  orden: 1 },
  { id: 2, nombre: 'Segundo contacto',    color: 'contacto-2',  orden: 2 },
  { id: 3, nombre: 'Tercer contacto',     color: 'contacto-3',  orden: 3 },
  { id: 4, nombre: 'Cuarto contacto',     color: 'contacto-4',  orden: 4 },
  { id: 5, nombre: 'Quinto contacto',     color: 'contacto-5',  orden: 5 },
  { id: 6, nombre: 'Sexto contacto',      color: 'contacto-6',  orden: 6 },
  { id: 7, nombre: 'Séptimo contacto',    color: 'contacto-7',  orden: 7 },
  { id: 8, nombre: 'Cotización enviada',  color: 'cotizacion',  orden: 8 },
  { id: 9, nombre: 'En proceso de firma', color: 'firma',       orden: 9 },
  { id: 10, nombre: 'Evaluación médica',  color: 'evaluacion',  orden: 10 },
  { id: 11, nombre: 'Convertido',         color: 'convertido',  orden: 11 },
  { id: 12, nombre: 'Descartado',         color: 'descartado',  orden: 12 },
]

// Cadencia de seguimiento en días desde la fecha de creación
// Juanfer definió: contacto 1→0d, 2→1d, 3→4d, 4→6d, 5→8d, 6→10d, 7→12d
export const CADENCIA_DIAS = [0, 1, 4, 6, 8, 10, 12]

// Canales de origen — crítico para WhatsApp futuro
export const CANALES_ORIGEN = [
  { value: 'manual',     label: 'Manual' },
  { value: 'whatsapp',   label: 'WhatsApp' },  // se activa cuando llegue WABA
  { value: 'formulario', label: 'Formulario' },
  { value: 'csv',        label: 'CSV' },
]

// ── Shape de un prospecto (contrato frontend ↔ backend) ──
// Sammy: FastAPI debe devolver este mismo shape.
// Campos con ? son opcionales en creación pero presentes en respuesta.
//
// {
//   id: number,
//   nombre: string,
//   tipo_documento_id: number,
//   numero_documento: string,
//   telefono: string,
//   correo: string | null,
//   ocupacion: string | null,
//   ciudad: string | null,
//   canal_origen: 'manual' | 'whatsapp' | 'formulario' | 'csv',
//   estado_id: number,
//   estado_nombre: string,
//   estado_color: string,
//   responsable_id: number,
//   responsable_nombre: string,
//   aseguradora_interes_id: number | null,
//   aseguradora_interes_nombre: string | null,
//   ramo_interes_id: number | null,
//   ramo_interes_nombre: string | null,
//   observaciones: string | null,
//   intentos_contacto: number,          // 0-7
//   fecha_primer_contacto: string,      // ISO date
//   fecha_ultimo_contacto: string | null,
//   proximo_contacto: string | null,    // ISO date — calculado por backend
//   poliza_id: number | null,           // si ya fue convertido
//   created_at: string,
//   updated_at: string,
// }

// ── Mock data ─────────────────────────────────────────────
const hoy = new Date()
const hace = (d) => new Date(hoy - d * 86400000).toISOString().split('T')[0]
const en   = (d) => new Date(+hoy + d * 86400000).toISOString().split('T')[0]

const MOCK_PROSPECTOS = [
  {
    id: 1,
    nombre: 'Carlos Mejía Ruiz',
    tipo_documento_id: 1,
    numero_documento: '1.034.567.890',
    telefono: '312 456 7890',
    correo: 'cmejia@email.com',
    ocupacion: 'Comerciante',
    ciudad: 'Bogotá',
    canal_origen: 'whatsapp',
    estado_id: 1,
    estado_nombre: 'Primer contacto',
    estado_color: 'contacto-1',
    responsable_id: 2,
    responsable_nombre: 'Gina López',
    aseguradora_interes_id: 1,
    aseguradora_interes_nombre: 'SURA',
    ramo_interes_id: 3,
    ramo_interes_nombre: 'Salud',
    observaciones: 'Interesado en plan familiar',
    intentos_contacto: 1,
    fecha_primer_contacto: hace(3),
    fecha_ultimo_contacto: hace(3),
    proximo_contacto: hace(2),   // vencido
    poliza_id: null,
    created_at: hace(3),
    updated_at: hace(3),
  },
  {
    id: 2,
    nombre: 'Ana Patricia Suárez',
    tipo_documento_id: 1,
    numero_documento: '43.210.987',
    telefono: '300 123 4567',
    correo: 'asuarez@gmail.com',
    ocupacion: 'Docente',
    ciudad: 'Medellín',
    canal_origen: 'formulario',
    estado_id: 8,
    estado_nombre: 'Cotización enviada',
    estado_color: 'cotizacion',
    responsable_id: 3,
    responsable_nombre: 'Diego Martínez',
    aseguradora_interes_id: 1,
    aseguradora_interes_nombre: 'SURA',
    ramo_interes_id: 2,
    ramo_interes_nombre: 'Vida',
    observaciones: null,
    intentos_contacto: 3,
    fecha_primer_contacto: hace(6),
    fecha_ultimo_contacto: hace(1),
    proximo_contacto: hace(0),   // hoy
    poliza_id: null,
    created_at: hace(6),
    updated_at: hace(1),
  },
  {
    id: 3,
    nombre: 'Roberto Londoño Castro',
    tipo_documento_id: 1,
    numero_documento: '79.654.321',
    telefono: '317 890 1234',
    correo: null,
    ocupacion: 'Empresario',
    ciudad: 'Cali',
    canal_origen: 'csv',
    estado_id: 9,
    estado_nombre: 'En proceso de firma',
    estado_color: 'firma',
    responsable_id: 4,
    responsable_nombre: 'Dilma Suárez',
    aseguradora_interes_id: 2,
    aseguradora_interes_nombre: 'Bolívar',
    ramo_interes_id: 1,
    ramo_interes_nombre: 'Autos',
    observaciones: 'Esperando firma digital',
    intentos_contacto: 4,
    fecha_primer_contacto: hace(10),
    fecha_ultimo_contacto: hace(2),
    proximo_contacto: en(2),
    poliza_id: null,
    created_at: hace(10),
    updated_at: hace(2),
  },
  {
    id: 4,
    nombre: 'Lucía Fernández Mora',
    tipo_documento_id: 1,
    numero_documento: '52.111.222',
    telefono: '304 567 8901',
    correo: 'lucia.fernandez@hotmail.com',
    ocupacion: 'Contadora',
    ciudad: 'Bogotá',
    canal_origen: 'manual',
    estado_id: 3,
    estado_nombre: 'Tercer contacto',
    estado_color: 'contacto-3',
    responsable_id: 2,
    responsable_nombre: 'Gina López',
    aseguradora_interes_id: null,
    aseguradora_interes_nombre: null,
    ramo_interes_id: 3,
    ramo_interes_nombre: 'Salud',
    observaciones: null,
    intentos_contacto: 3,
    fecha_primer_contacto: hace(5),
    fecha_ultimo_contacto: hace(1),
    proximo_contacto: en(5),
    poliza_id: null,
    created_at: hace(5),
    updated_at: hace(1),
  },
  {
    id: 5,
    nombre: 'Hernando Ospina Gil',
    tipo_documento_id: 1,
    numero_documento: '8.765.432',
    telefono: '315 234 5678',
    correo: null,
    ocupacion: null,
    ciudad: 'Pereira',
    canal_origen: 'whatsapp',
    estado_id: 12,
    estado_nombre: 'Descartado',
    estado_color: 'descartado',
    responsable_id: 5,
    responsable_nombre: 'Lina Castro',
    aseguradora_interes_id: null,
    aseguradora_interes_nombre: null,
    ramo_interes_id: null,
    ramo_interes_nombre: null,
    observaciones: 'No contestó en 7 intentos',
    intentos_contacto: 7,
    fecha_primer_contacto: hace(20),
    fecha_ultimo_contacto: hace(8),
    proximo_contacto: null,
    poliza_id: null,
    created_at: hace(20),
    updated_at: hace(8),
  },
  {
    id: 6,
    nombre: 'Marcela Torres Ríos',
    tipo_documento_id: 1,
    numero_documento: '29.876.543',
    telefono: '310 987 6543',
    correo: 'marcela.torres@empresa.co',
    ocupacion: 'Gerente comercial',
    ciudad: 'Bogotá',
    canal_origen: 'csv',
    estado_id: 11,
    estado_nombre: 'Convertido',
    estado_color: 'convertido',
    responsable_id: 3,
    responsable_nombre: 'Diego Martínez',
    aseguradora_interes_id: 1,
    aseguradora_interes_nombre: 'SURA',
    ramo_interes_id: 4,
    ramo_interes_nombre: 'Responsabilidad Civil',
    observaciones: null,
    intentos_contacto: 2,
    fecha_primer_contacto: hace(15),
    fecha_ultimo_contacto: hace(7),
    proximo_contacto: null,
    poliza_id: 42,   // ya tiene póliza creada
    created_at: hace(15),
    updated_at: hace(7),
  },
]

// Resumen del pipeline para las cards superiores
const MOCK_RESUMEN_PIPELINE = ESTADOS_PIPELINE.map((e) => ({
  estado_id: e.id,
  estado_nombre: e.nombre,
  estado_color: e.color,
  cantidad: MOCK_PROSPECTOS.filter((p) => p.estado_id === e.id).length,
}))

// ── Helpers internos mock ─────────────────────────────────
function _filtrarMock(filtros = {}) {
  let lista = [...MOCK_PROSPECTOS]
  const { busqueda, estado_id, canal_origen, responsable_id, proximo_contacto } = filtros

  if (busqueda) {
    const q = busqueda.toLowerCase()
    lista = lista.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.numero_documento.replace(/\./g, '').includes(q.replace(/\./g, ''))
    )
  }
  if (estado_id)       lista = lista.filter((p) => p.estado_id === Number(estado_id))
  if (canal_origen)    lista = lista.filter((p) => p.canal_origen === canal_origen)
  if (responsable_id)  lista = lista.filter((p) => p.responsable_id === Number(responsable_id))

  if (proximo_contacto === 'hoy') {
    const hoyStr = new Date().toISOString().split('T')[0]
    lista = lista.filter((p) => p.proximo_contacto === hoyStr)
  } else if (proximo_contacto === 'vencido') {
    const hoyStr = new Date().toISOString().split('T')[0]
    lista = lista.filter((p) => p.proximo_contacto && p.proximo_contacto < hoyStr)
  } else if (proximo_contacto === 'semana') {
    const hoyStr = new Date().toISOString().split('T')[0]
    const fin    = new Date(+new Date() + 7 * 86400000).toISOString().split('T')[0]
    lista = lista.filter(
      (p) => p.proximo_contacto && p.proximo_contacto >= hoyStr && p.proximo_contacto <= fin
    )
  }

  return lista
}

// ── API pública ───────────────────────────────────────────

/**
 * Lista prospectos con filtros opcionales y paginación.
 * GET /api/v1/prospectos?busqueda=&estado_id=&canal_origen=&responsable_id=&proximo_contacto=&page=&limit=
 */
export async function listarProspectos(filtros = {}, page = 1, limit = 15) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    const lista = _filtrarMock(filtros)
    const inicio = (page - 1) * limit
    return {
      items: lista.slice(inicio, inicio + limit),
      total: lista.length,
      page,
      pages: Math.ceil(lista.length / limit),
    }
  }
  const params = { ...filtros, page, limit }
  const { data } = await axiosInstance.get('/api/v1/prospectos', { params })
  return data
}

/**
 * Resumen por estado para las cards del pipeline.
 * GET /api/v1/prospectos/resumen-pipeline
 * Respuesta: [{ estado_id, estado_nombre, estado_color, cantidad }]
 */
export async function obtenerResumenPipeline() {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 200))
    return MOCK_RESUMEN_PIPELINE
  }
  const { data } = await axiosInstance.get('/api/v1/prospectos/resumen-pipeline')
  return data
}

/**
 * Obtiene un prospecto por ID.
 * GET /api/v1/prospectos/:id
 */
export async function obtenerProspecto(id) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 200))
    const p = MOCK_PROSPECTOS.find((x) => x.id === Number(id))
    if (!p) throw new Error('Prospecto no encontrado')
    return p
  }
  const { data } = await axiosInstance.get(`/api/v1/prospectos/${id}`)
  return data
}

/**
 * Crea un prospecto nuevo.
 * POST /api/v1/prospectos
 * Body: { nombre, tipo_documento_id, numero_documento, telefono,
 *         correo?, ocupacion?, ciudad?, canal_origen,
 *         responsable_id, aseguradora_interes_id?, ramo_interes_id?,
 *         observaciones? }
 */
export async function crearProspecto(datos) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400))
    const nuevo = {
      ...datos,
      id: Math.max(...MOCK_PROSPECTOS.map((p) => p.id)) + 1,
      estado_id: 1,
      estado_nombre: 'Primer contacto',
      estado_color: 'contacto-1',
      intentos_contacto: 0,
      fecha_primer_contacto: new Date().toISOString().split('T')[0],
      fecha_ultimo_contacto: null,
      proximo_contacto: new Date().toISOString().split('T')[0],
      poliza_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    MOCK_PROSPECTOS.push(nuevo)
    return nuevo
  }
  const { data } = await axiosInstance.post('/api/v1/prospectos', datos)
  return data
}

/**
 * Edita un prospecto existente.
 * PUT /api/v1/prospectos/:id
 */
export async function editarProspecto(id, datos) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    const idx = MOCK_PROSPECTOS.findIndex((p) => p.id === Number(id))
    if (idx === -1) throw new Error('Prospecto no encontrado')
    MOCK_PROSPECTOS[idx] = { ...MOCK_PROSPECTOS[idx], ...datos, updated_at: new Date().toISOString() }
    return MOCK_PROSPECTOS[idx]
  }
  const { data } = await axiosInstance.put(`/api/v1/prospectos/${id}`, datos)
  return data
}

/**
 * Avanza el estado del pipeline y registra un intento de contacto.
 * PATCH /api/v1/prospectos/:id/avanzar-contacto
 * Lógica backend:
 *   1. incrementa intentos_contacto
 *   2. actualiza fecha_ultimo_contacto = NOW()
 *   3. calcula proximo_contacto según CADENCIA_DIAS[intentos_contacto]
 *   4. si intentos_contacto >= 7 → estado 'Descartado' automático (opcional, configurar)
 */
export async function avanzarContacto(id) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    const idx = MOCK_PROSPECTOS.findIndex((p) => p.id === Number(id))
    if (idx === -1) throw new Error('Prospecto no encontrado')
    const p = MOCK_PROSPECTOS[idx]
    const nuevoIntentos = Math.min(p.intentos_contacto + 1, 7)
    const diasSiguiente = CADENCIA_DIAS[nuevoIntentos] ?? null
    const proximoContacto = diasSiguiente !== null
      ? new Date(+new Date() + diasSiguiente * 86400000).toISOString().split('T')[0]
      : null
    MOCK_PROSPECTOS[idx] = {
      ...p,
      intentos_contacto: nuevoIntentos,
      fecha_ultimo_contacto: new Date().toISOString().split('T')[0],
      proximo_contacto: proximoContacto,
      estado_id: nuevoIntentos <= 7 ? nuevoIntentos : 12,
      estado_nombre: nuevoIntentos <= 7
        ? ESTADOS_PIPELINE[nuevoIntentos - 1]?.nombre ?? 'Séptimo contacto'
        : 'Descartado',
      updated_at: new Date().toISOString(),
    }
    return MOCK_PROSPECTOS[idx]
  }
  const { data } = await axiosInstance.patch(`/api/v1/prospectos/${id}/avanzar-contacto`)
  return data
}

/**
 * Cambia el estado manualmente (para estados operativos: cotización, firma, etc.)
 * PATCH /api/v1/prospectos/:id/estado
 * Body: { estado_id: number }
 */
export async function cambiarEstadoProspecto(id, estado_id) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 250))
    const idx = MOCK_PROSPECTOS.findIndex((p) => p.id === Number(id))
    if (idx === -1) throw new Error('Prospecto no encontrado')
    const estado = ESTADOS_PIPELINE.find((e) => e.id === estado_id)
    MOCK_PROSPECTOS[idx] = {
      ...MOCK_PROSPECTOS[idx],
      estado_id,
      estado_nombre: estado?.nombre ?? '',
      estado_color: estado?.color ?? '',
      updated_at: new Date().toISOString(),
    }
    return MOCK_PROSPECTOS[idx]
  }
  const { data } = await axiosInstance.patch(`/api/v1/prospectos/${id}/estado`, { estado_id })
  return data
}

/**
 * Convierte un prospecto en póliza.
 * POST /api/v1/prospectos/:id/convertir
 * Lógica backend:
 *   1. crea registro en tabla poliza con campos comunes del prospecto
 *   2. marca prospecto con estado_id = 11 (Convertido) y poliza_id = nueva_poliza.id
 *   3. devuelve { poliza_id, prospecto_id }
 * El frontend redirige a /produccion/nueva?desde_prospecto=ID para que el
 * asesor complete los campos diferidos (prima, número póliza, fecha expedición).
 *
 * NOTA: en mock, no creamos la póliza real — solo marcamos el estado.
 * El flujo real de conversión es navegar al PolizaForm con el query param.
 */
export async function convertirProspecto(id) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500))
    const idx = MOCK_PROSPECTOS.findIndex((p) => p.id === Number(id))
    if (idx === -1) throw new Error('Prospecto no encontrado')
    const polizaIdMock = 900 + idx
    MOCK_PROSPECTOS[idx] = {
      ...MOCK_PROSPECTOS[idx],
      estado_id: 11,
      estado_nombre: 'Convertido',
      estado_color: 'convertido',
      poliza_id: polizaIdMock,
      updated_at: new Date().toISOString(),
    }
    return { poliza_id: polizaIdMock, prospecto_id: Number(id) }
  }
  const { data } = await axiosInstance.post(`/api/v1/prospectos/${id}/convertir`)
  return data
}

/**
 * Importación masiva desde CSV normalizado.
 * POST /api/v1/prospectos/importar
 * Body: { filas: ProspectoImportRow[] }
 *
 * ProspectoImportRow — columnas de la PLANTILLA NORMALIZADA:
 * {
 *   nombre:           string,   // requerido
 *   numero_documento: string,   // requerido
 *   tipo_documento:   string,   // "CC" | "CE" | "NIT" | "PP" — se mapea a tipo_documento_id
 *   telefono:         string,   // requerido
 *   correo:           string?,
 *   ocupacion:        string?,
 *   ciudad:           string?,
 *   ramo_interes:     string?,  // nombre del ramo — se mapea a ramo_interes_id
 *   aseguradora:      string?,  // nombre — se mapea a aseguradora_interes_id
 *   observaciones:    string?,
 * }
 *
 * El campo canal_origen se fija en 'csv' automáticamente en el backend.
 * El responsable_id se asigna al usuario que hace la importación.
 *
 * Respuesta:
 * { importados: number, omitidos: number, errores: [{ fila, motivo }] }
 */
export async function importarProspectos(filas) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 800))
    // Simula validación: rechaza filas sin nombre o documento
    const errores = []
    let importados = 0
    filas.forEach((fila, i) => {
      if (!fila.nombre || !fila.numero_documento || !fila.telefono) {
        errores.push({ fila: i + 2, motivo: 'Faltan campos requeridos: nombre, documento o teléfono' })
      } else {
        importados++
      }
    })
    return { importados, omitidos: errores.length, errores }
  }
  const { data } = await axiosInstance.post('/api/v1/prospectos/importar', { filas })
  return data
}

/**
 * Obtiene la plantilla normalizada de importación como blob descargable.
 * GET /api/v1/prospectos/plantilla-importacion
 * Devuelve un archivo .xlsx con headers y una fila de ejemplo.
 *
 * En mock: genera el xlsx en frontend usando SheetJS (mismo patrón que exportar pólizas).
 */
export async function descargarPlantillaImportacion() {
  if (USE_MOCK) {
    return _generarPlantillaMock()
  }
  const resp = await axiosInstance.get('/api/v1/prospectos/plantilla-importacion', {
    responseType: 'blob',
  })
  return resp.data
}

// Genera el xlsx de plantilla usando SheetJS (debe estar cargado en window.XLSX)
function _generarPlantillaMock() {
  if (!window.XLSX) throw new Error('SheetJS no está disponible')
  const XLSX = window.XLSX

  // Headers exactos de la plantilla normalizada
  const headers = [
    'NOMBRE_COMPLETO',
    'TIPO_DOCUMENTO',
    'NUMERO_DOCUMENTO',
    'TELEFONO',
    'CORREO',
    'OCUPACION',
    'CIUDAD',
    'RAMO_INTERES',
    'ASEGURADORA',
    'OBSERVACIONES',
  ]

  // Fila de ejemplo para guiar al usuario
  const ejemplo = [
    'Juan Fernando Zapata',
    'CC',
    '1023456789',
    '3001234567',
    'juan@email.com',
    'Comerciante',
    'Bogotá',
    'Salud',
    'SURA',
    'Interesado en plan familiar SURA',
  ]

  const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo])

  // Anchos de columna
  ws['!cols'] = headers.map(() => ({ wch: 22 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Prospectos')

  // Descarga directa
  XLSX.writeFile(wb, 'Plantilla_Importacion_Prospectos.xlsx')
}

/**
 * Parsea un archivo Excel/CSV subido y devuelve las filas normalizadas.
 * Solo frontend — no llama al backend.
 * Usa SheetJS (window.XLSX) igual que importExport.js.
 *
 * Columnas aceptadas (insensible a mayúsculas y tildes):
 *   NOMBRE_COMPLETO | NOMBRE
 *   TIPO_DOCUMENTO
 *   NUMERO_DOCUMENTO | CEDULA | DOCUMENTO
 *   TELEFONO | CELULAR
 *   CORREO | EMAIL
 *   OCUPACION
 *   CIUDAD
 *   RAMO_INTERES | RAMO
 *   ASEGURADORA
 *   OBSERVACIONES | NOTAS
 */
export function parsearArchivoProspectos(archivo) {
  return new Promise((resolve, reject) => {
    if (!window.XLSX) {
      reject(new Error('SheetJS no está disponible. Recarga la página e intenta de nuevo.'))
      return
    }
    const XLSX = window.XLSX
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const raw  = XLSX.utils.sheet_to_json(ws, { defval: '' })

        // Normaliza nombre de columna (sin tildes, sin espacios, uppercase)
        const norm = (s) =>
          s.toString()
            .toUpperCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '_')

        // Mapa de alias de columnas a nombre canónico
        const ALIAS = {
          NOMBRE_COMPLETO:  'nombre',
          NOMBRE:           'nombre',
          TIPO_DOCUMENTO:   'tipo_documento',
          NUMERO_DOCUMENTO: 'numero_documento',
          CEDULA:           'numero_documento',
          DOCUMENTO:        'numero_documento',
          TELEFONO:         'telefono',
          CELULAR:          'telefono',
          CORREO:           'correo',
          EMAIL:            'correo',
          OCUPACION:        'ocupacion',
          CIUDAD:           'ciudad',
          RAMO_INTERES:     'ramo_interes',
          RAMO:             'ramo_interes',
          ASEGURADORA:      'aseguradora',
          OBSERVACIONES:    'observaciones',
          NOTAS:            'observaciones',
        }

        const filas = raw.map((fila) => {
          const out = {}
          for (const [col, val] of Object.entries(fila)) {
            const canonical = ALIAS[norm(col)]
            if (canonical) out[canonical] = String(val).trim()
          }
          return out
        }).filter((f) => Object.keys(f).length > 0)

        resolve(filas)
      } catch (err) {
        reject(new Error(`Error leyendo el archivo: ${err.message}`))
      }
    }

    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsArrayBuffer(archivo)
  })
}