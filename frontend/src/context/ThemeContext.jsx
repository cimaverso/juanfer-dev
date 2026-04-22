// ============================================================
// context/ThemeContext.jsx
// Estado global del tema: claro / oscuro
// Provee: tema, esDark, toggleTema
// Persiste en localStorage bajo la clave 'jf_tema'
// Respeta prefers-color-scheme en la primera visita
// ============================================================

import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

// ── Clave de persistencia ─────────────────────────────────
const STORAGE_KEY = 'jf_tema'

// ── Leer preferencia del sistema operativo ───────────────
function getPreferenciaInicial() {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY)
    if (guardado) return guardado                          // usuario ya eligió
    const prefiereDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefiereDark ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(getPreferenciaInicial)

  // Aplicar atributo al <html> cada vez que cambia el tema
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema)
    try {
      localStorage.setItem(STORAGE_KEY, tema)
    } catch {
      // localStorage no disponible (modo privado estricto), ignorar
    }
  }, [tema])

  const toggleTema = () =>
    setTema((prev) => (prev === 'dark' ? 'light' : 'dark'))

  const esDark = tema === 'dark'

  const value = {
    tema,       // 'light' | 'dark'
    esDark,     // boolean — útil para condicionales en componentes
    toggleTema, // () => void
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

// ── Hook de consumo ───────────────────────────────────────
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  }
  return context
}