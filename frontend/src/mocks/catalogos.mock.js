// ============================================================
// mocks/catalogos.mock.js
// Catálogos maestros (REQ-17) — datos de referencia
// ============================================================

export const ESTADOS_POLIZA = [
  { id: 1, nombre: 'Expedido',               color: 'expedido' },
  { id: 2, nombre: 'En proceso de firma',    color: 'proceso' },
  { id: 3, nombre: 'Evaluación médica',      color: 'evaluacion' },
  { id: 4, nombre: 'Declinado',              color: 'declinado' },
  { id: 5, nombre: 'Pospuesto',              color: 'pospuesto' },
  { id: 6, nombre: 'Cancelado',              color: 'cancelado' },
  { id: 7, nombre: 'Pendiente de complemento', color: 'pendiente' },
]

export const ASEGURADORAS = [
  { id: 1, nombre: 'Sura' },
  { id: 2, nombre: 'Bolívar' },
  { id: 3, nombre: 'TravelKit' },
  { id: 4, nombre: 'Aria' },
  { id: 5, nombre: 'Allianz' },
  { id: 6, nombre: 'Nasa Fulcán' },
]

export const PRODUCTOS = [
  { id: 1, nombre: 'Plan Vive' },
  { id: 2, nombre: 'Plan Vive Plus' },
  { id: 3, nombre: 'PAC Tradicional' },
  { id: 4, nombre: 'SOAT' },
  { id: 5, nombre: 'Plan Salud 60+' },
  { id: 6, nombre: 'Seguro de Viaje' },
  { id: 7, nombre: 'Póliza Cumplimiento Empresarial' },
]

export const RAMOS = [
  { id: 1, codigo: '012', nombre: 'Cumplimiento' },
  { id: 2, codigo: '013', nombre: 'Responsabilidad Civil' },
  { id: 3, codigo: '021', nombre: 'Salud Familiar' },
  { id: 4, codigo: '031', nombre: 'Vida Individual' },
  { id: 5, codigo: '041', nombre: 'SOAT' },
]

export const TIPOS_DOCUMENTO = [
  { id: 1, nombre: 'CC' },
  { id: 2, nombre: 'CE' },
  { id: 3, nombre: 'NIT' },
  { id: 4, nombre: 'TI' },
]

export const ASESORES = [
  { id: 1, nombre: 'Dani Rodríguez',  rol: 'ADMIN',  iniciales: 'DR' },
  { id: 2, nombre: 'Juan Fernández',  rol: 'ADMIN',  iniciales: 'JF' },
  { id: 3, nombre: 'Gina López',      rol: 'ASESOR', iniciales: 'GL' },
  { id: 4, nombre: 'Diego Martínez',  rol: 'ASESOR', iniciales: 'DM' },
  { id: 5, nombre: 'Dilma Suárez',    rol: 'ASESOR', iniciales: 'DS' },
  { id: 6, nombre: 'Julieta Mora',    rol: 'ASESOR', iniciales: 'JM' },
  { id: 7, nombre: 'Lina Castro',     rol: 'ASESOR', iniciales: 'LC' },
]