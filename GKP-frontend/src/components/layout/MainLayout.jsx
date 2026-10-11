import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar - fix di kiri, off-canvas di mobile */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Area - offset oleh lebar sidebar hanya di layar lg ke atas */}
      <div className="lg:ml-64">
        {/* Header - sticky top */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Content Area */}
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
