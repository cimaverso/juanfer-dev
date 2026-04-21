// ============================================================
// main.jsx — actualizado para incluir ThemeProvider
// Orden de providers: ThemeProvider > AuthProvider > Router
// ThemeProvider va afuera porque el tema se aplica al <html>
// y no depende de autenticación.
// ============================================================

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import App from './App.jsx'
import './styles/global.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
)