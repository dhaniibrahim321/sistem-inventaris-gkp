import { useEffect, useState } from 'react'
import { Menu, User, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatTanggalIndonesia } from '../../utils/dateHelpers'
import { formatRoleLabel, getPendingCount, getStoredUser } from '../../services/userService'

export default function Header({ onMenuClick }) {
  const navigate = useNavigate()
  const user = getStoredUser()
  const isSuperAdmin = user?.role === 'super_admin'
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!isSuperAdmin) return

    let active = true
    async function loadCount() {
      try {
        const count = await getPendingCount()
        if (active) setPendingCount(count)
      } catch {
      }
    }

    loadCount()
    window.addEventListener('staff-verification-updated', loadCount)
    return () => {
      active = false
      window.removeEventListener('staff-verification-updated', loadCount)
    }
  }, [isSuperAdmin])

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
            className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition"
            title="Pengaturan"
            aria-label="Buka Pengaturan"
          >
            <Settings size={19} />
            {isSuperAdmin && pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-700">
                {user?.nama || 'Admin'}
              </p>
              <p className="text-xs text-slate-400">
                {formatRoleLabel(user?.role)}
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
