import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  ArrowLeftRight,
  BarChart3,
  ClipboardCheck,
  History,
  LogOut,
  User,
  X,
} from 'lucide-react'

import logoGKP from '../../assets/logo_GKP.png'

const menuItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Kelola Data Barang', path: '/barang', icon: Package },
  { label: 'Pencatatan Barang', path: '/barang-masuk', icon: PackagePlus },
  { label: 'Pergerakan Barang', path: '/pergerakan', icon: ArrowLeftRight },
  { label: 'Stok Barang', path: '/stok', icon: BarChart3 },
  { label: 'Stok Opname', path: '/stock-opname', icon: ClipboardCheck },
  { label: 'Riwayat Aktivitas', path: '/riwayat', icon: History },
]

export default function Sidebar({ isOpen = false, onClose }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    navigate('/')
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-screen w-64 bg-[#C2B6FE] text-slate-800 flex flex-col z-50
          transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="px-6 py-5 border-b border-black/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logoGKP}
              alt="Logo SIGKP"
              className="h-10 w-10 rounded-md object-cover"
            />
            <div>
              <h2 className="text-sm font-bold leading-tight text-slate-900">SIGKP</h2>
              <p className="text-xs text-slate-700">Inventaris Gudang</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-700 hover:bg-black/10 hover:text-slate-900"
            aria-label="Tutup menu navigasi"
          >
            <X size={18} />
          </button>
        </div>

        <nav aria-label="Menu navigasi utama" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? 'bg-[#8A7CD9] text-white'
                    : 'text-slate-800 hover:bg-black/10'
                }`
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-black/10 px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-white/40 flex items-center justify-center">
              <User size={18} className="text-slate-800" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">User</p>
              <p className="text-xs text-slate-700">Role User</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-800 hover:bg-black/10 transition-colors duration-200"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}