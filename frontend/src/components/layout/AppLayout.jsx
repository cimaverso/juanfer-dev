// ============================================================
// components/layout/AppLayout.jsx
// Shell principal: sidebar + navbar + área de contenido
// ============================================================

import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Navbar from './Navbar.jsx'
import './AppLayout.css'

const STORAGE_KEY = 'jf_sidebar_collapsed'

export default function AppLayout() {
  const [colapsado, setColapsado] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, colapsado)
  }, [colapsado])

  const toggleSidebar = () => setColapsado((prev) => !prev)

  return (
    <div className={`app-shell ${colapsado ? 'sidebar-colapsado' : ''}`}>
      <Sidebar colapsado={colapsado} onToggle={toggleSidebar} />
      <div className="app-main">
        <Navbar onToggleSidebar={toggleSidebar} colapsado={colapsado} />
        <main className="app-content">
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}