// ============================================================
// src/router/AppRouter.jsx
// Actualizado — M3 Prospectos + Admin catálogos
// Respeta el ProtectedRoute existente con prop rolRequerido
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import ProtectedRoute from './ProtectedRoute.jsx'
import AppLayout from '../components/layout/AppLayout.jsx'

// ── Carga diferida de páginas ─────────────────────────────
const Login            = lazy(() => import('../pages/auth/Login.jsx'))
const Dashboard        = lazy(() => import('../pages/dashboard/Dashboard.jsx'))

// M1 — Producción (existente)
const Produccion       = lazy(() => import('../pages/produccion/Produccion.jsx'))
const PolizaForm       = lazy(() => import('../pages/produccion/PolizaForm.jsx'))
const PolizaDetalle    = lazy(() => import('../pages/produccion/PolizaDetalle.jsx'))

// M3 — Prospectos (nuevo)
const Prospectos       = lazy(() => import('../pages/prospectos/Prospectos.jsx'))
const ProspectoForm    = lazy(() => import('../pages/prospectos/ProspectoForm.jsx'))
const ProspectoDetalle = lazy(() => import('../pages/prospectos/ProspectoDetalle.jsx'))

// Admin (nuevo — solo ADMIN)
const AdminCatalogos   = lazy(() => import('../pages/admin/AdminCatalogos.jsx'))

// Formularios dinámicos (nuevo — admin solo ADMIN, vista pública sin auth)
const Formularios         = lazy(() => import('../pages/formularios/Formularios.jsx'))
const FormularioBuilder   = lazy(() => import('../pages/formularios/FormularioBuilder.jsx'))
const FormularioRespuestas = lazy(() => import('../pages/formularios/FormularioRespuestas.jsx'))
const FormularioPublico    = lazy(() => import('../pages/publico/FormularioPublico.jsx'))

// Módulos futuros — descomenta cuando estén listos
// const Cotizaciones  = lazy(() => import('../pages/cotizaciones/Cotizaciones.jsx'))
// const Cancelaciones = lazy(() => import('../pages/cancelaciones/Cancelaciones.jsx'))
// const Plantillas    = lazy(() => import('../pages/plantillas/Plantillas.jsx'))

// ── Fallback de carga ─────────────────────────────────────
function PaginaCargando() {
  return (
    <div style={{
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      height:          '100vh',
      backgroundColor: 'var(--color-fondo)',
    }}>
      <div className="spinner" />
    </div>
  )
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PaginaCargando />}>
        <Routes>

          {/* ── Rutas públicas (sin login) ──────────────── */}
          <Route path="/login" element={<Login />} />
          <Route path="/f/:token" element={<FormularioPublico />} />

          {/* ── Rutas protegidas (cualquier rol) ────────── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>

              {/* Raíz → dashboard */}
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />

              {/* M1 — Producción */}
              <Route path="/produccion"            element={<Produccion />} />
              <Route path="/produccion/nueva"      element={<PolizaForm />} />
              <Route path="/produccion/:id"        element={<PolizaDetalle />} />
              <Route path="/produccion/:id/editar" element={<PolizaForm />} />

              {/* M3 — Prospectos */}
              <Route path="/prospectos"              element={<Prospectos />} />
              <Route path="/prospectos/nuevo"        element={<ProspectoForm />} />
              <Route path="/prospectos/:id"          element={<ProspectoDetalle />} />
              <Route path="/prospectos/:id/editar"   element={<ProspectoForm />} />

              {/* M2 — Cotizaciones (próxima fase) */}
              {/* <Route path="/cotizaciones" element={<Cotizaciones />} /> */}

              {/* M4 — Cancelaciones (próxima fase) */}
              {/* <Route path="/cancelaciones" element={<Cancelaciones />} /> */}

              {/* M5 — Plantillas (próxima fase) */}
              {/* <Route path="/plantillas" element={<Plantillas />} /> */}

            </Route>
          </Route>

          {/* ── Rutas protegidas solo ADMIN ─────────────── */}
          <Route element={<ProtectedRoute rolRequerido="ADMIN" />}>
            <Route element={<AppLayout />}>
              <Route path="/admin/catalogos" element={<AdminCatalogos />} />
              <Route path="/admin/formularios" element={<Formularios />} />
              <Route path="/admin/formularios/:id/editar" element={<FormularioBuilder />} />
              <Route path="/admin/formularios/:id/respuestas" element={<FormularioRespuestas />} />
            </Route>
          </Route>

          {/* ── Ruta no encontrada → dashboard ──────────── */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />

        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}