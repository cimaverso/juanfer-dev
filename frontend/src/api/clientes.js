// ============================================================
// api/clientes.js
// Cliente — hoy solo lo que necesita la vista de Producción
// (formularios respondidos). El resto de Cliente vive implícito
// dentro de Póliza (api/polizas.js), sin CRUD propio en el front.
// Backend real desde el día 1 (mismo patrón que api/formularios.js).
// Endpoint: GET /clientes/{id}/formularios-respondidos
// ============================================================

import api from './axios.js'

export async function obtenerFormulariosRespondidosCliente(clienteId) {
  const { data } = await api.get(`/clientes/${clienteId}/formularios-respondidos`)
  return data
}
