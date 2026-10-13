import { Menu, User, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatTanggalIndonesia } from '../../utils/dateHelpers'

export default function Header({ onMenuClick }) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between gap-3">

        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Buka menu navigasi"
          >
            <Menu size={20} />
          </button>

          <p className="text-sm text-slate-500 truncate">
            {formatTanggalIndonesia()}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">

          <button
            type="button"
            onClick={() => navigate('/pengaturan')}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition"
            title="Pengaturan"
            aria-label="Buka Pengaturan"
          >
            <Settings size={19} />
          </button>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-700">
                User
              </p>
              <p className="text-xs text-slate-400">
                Role User
              </p>
            </div>

            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
              <User size={18} className="text-slate-500" />
            </div>
          </div>

        </div>
      </div>
    </header>
  )
}