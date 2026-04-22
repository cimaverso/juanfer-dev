// ============================================================
// router/AppRouter.jsx
// Árbol completo de rutas de la aplicación
// Estructura:
//   /login                    → público
//   /                         → protegido (cualquier usuario)
//     /dashboard              → M6
//     /produccion             → M1
//     /cotizaciones           → M2
//     /prospectos             → M3
//     /cancelaciones          → M4
//     /plantillas             → M5
//     /admin/*                → solo ADMIN
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import ProtectedRoute from './ProtectedRoute.jsx'
import AppLayout from '../components/layout/AppLayout.jsx'

// ── Carga diferida de páginas ─────────────────────────────
// Cada módulo se carga solo cuando el usuario navega a él.
// Reduce el bundle inicial significativamente.
const Login         = lazy(() => import('../pages/auth/Login.jsx'))
const Dashboard     = lazy(() => import('../pages/dashboard/Dashboard.jsx'))
const Produccion    = lazy(() => import('../pages/produccion/Produccion.jsx'))
const PolizaForm    = lazy(() => import('../pages/produccion/PolizaForm.jsx'))
const PolizaDetalle = lazy(() => import('../pages/produccion/PolizaDetalle.jsx'))

// Módulos futuros — se activan cuando se construyan
// const Cotizaciones  = lazy(() => import('../pages/cotizaciones/Cotizaciones.jsx'))
// const Prospectos    = lazy(() => import('../pages/prospectos/Prospectos.jsx'))
// const Cancelaciones = lazy(() => import('../pages/cancelaciones/Cancelaciones.jsx'))
// const Plantillas    = lazy(() => import('../pages/plantillas/Plantillas.jsx'))
// const Admin         = lazy(() => import('../pages/admin/Admin.jsx'))

// ── Fallback de carga ─────────────────────────────────────
function PaginaCargando() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
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

          {/* ── Ruta pública ─────────────────────────── */}
          <Route path="/login" element={<Login />} />

          {/* ── Rutas protegidas (cualquier rol) ──────── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>

              {/* Raíz → dashboard */}
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />

              {/* M1 — Producción */}
              <Route path="/produccion" element={<Produccion />} />
              <Route path="/produccion/nueva" element={<PolizaForm />} />
              <Route path="/produccion/:id" element={<PolizaDetalle />} />
              <Route path="/produccion/:id/editar" element={<PolizaForm />} />

              {/* M2 — Cotizaciones (próxima fase) */}
              {/* <Route path="/cotizaciones" element={<Cotizaciones />} /> */}

              {/* M3 — Prospectos (próxima fase) */}
              {/* <Route path="/prospectos" element={<Prospectos />} /> */}

              {/* M4 — Cancelaciones (próxima fase) */}
              {/* <Route path="/cancelaciones" element={<Cancelaciones />} /> */}

              {/* M5 — Plantillas (próxima fase) */}
              {/* <Route path="/plantillas" element={<Plantillas />} /> */}

            </Route>
          </Route>

          {/* ── Rutas protegidas solo ADMIN ───────────── */}
          <Route element={<ProtectedRoute rolRequerido="ADMIN" />}>
            <Route element={<AppLayout />}>
              {/* <Route path="/admin" element={<Admin />} /> */}
            </Route>
          </Route>

          {/* ── Ruta no encontrada ────────────────────── */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />

        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}