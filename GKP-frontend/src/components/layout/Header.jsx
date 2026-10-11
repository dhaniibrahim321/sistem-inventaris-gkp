import { Menu, User } from 'lucide-react'
import { formatTanggalIndonesia } from '../../utils/dateHelpers'

export default function Header({ onMenuClick }) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between gap-3">
        {/* Tombol Hamburger (mobile) + Tanggal Hari Ini */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Buka menu navigasi"
          >
            <Menu size={20} />
          </button>
          <p className="text-sm text-slate-500 truncate">{formatTanggalIndonesia()}</p>
        </div>

        {/* Info User */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-700">User</p>
            <p className="text-xs text-slate-400">Role User</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
            <User size={18} className="text-slate-500" />
          </div>
        </div>
      </div>
    </header>
  )
}
