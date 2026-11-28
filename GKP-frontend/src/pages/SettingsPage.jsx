import { useEffect, useState } from 'react'
import {
  Settings,
  AlertTriangle,
  CalendarClock,
  Save,
  RotateCcw,
  UserCheck,
  Users,
  Check,
  X,
  UserX,
  Loader2,
} from 'lucide-react'
import {
  formatRoleLabel,
  getDaftarStaf,
  getStoredUser,
  nonaktifkanStaf,
  verifikasiStaf,
} from '../services/userService'
import { formatTanggal } from '../utils/dateHelpers'

const DEFAULT_SETTINGS = {
  stokKritisGudang: 5,
  stokKritisDisplay: 3,
  kadaluarsaBulan: 3,
  kadaluarsaMendesakHari: 30,
}

function loadSettings() {
  try {
    const saved = localStorage.getItem('inventaris_settings')
    if (!saved) return DEFAULT_SETTINGS

    return {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(saved),
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function SettingCard({ icon: Icon, title, description, badge, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <Icon size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{description}</p>
          </div>
        </div>
        {badge}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function NumberInput({ label, value, onChange, suffix, min = 0 }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        {label}
      </label>
      <div className="flex">
        <input
          type="number"
          min={min}
          value={value}
          onChange={(e) => {
            const raw = e.target.value
            const next = raw === '' ? min : Number(raw)
            onChange(Math.max(min, Number.isFinite(next) ? next : min))
          }}
          className="w-full rounded-l-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
        />
        {suffix && (
          <div className="px-3 py-2 bg-slate-50 border border-l-0 border-slate-200 rounded-r-lg text-xs text-slate-500 flex items-center">
            {suffix}
          </div>
        )}
      </div>
    </div>
  )
}

const STATUS_STYLE = {
  aktif: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  nonaktif: 'bg-slate-100 text-slate-600 border-slate-200',
  ditolak: 'bg-rose-50 text-rose-700 border-rose-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
}

const STATUS_LABEL = {
  aktif: 'Aktif',
  nonaktif: 'Nonaktif',
  ditolak: 'Ditolak',
  pending: 'Menunggu',
}

export default function SettingsPage() {
  const user = getStoredUser()
  const isSuperAdmin = user?.role === 'super_admin'

  const [settings, setSettings] = useState(loadSettings)
  const [saved, setSaved] = useState(false)

  const [staffList, setStaffList] = useState([])
  const [loadingStaff, setLoadingStaff] = useState(false)
  const [actionUserId, setActionUserId] = useState(null)
  const [staffNotice, setStaffNotice] = useState({ type: '', text: '' })

  useEffect(() => {
    setSaved(false)
  }, [settings])

  async function loadStaff() {
    if (!isSuperAdmin) return
    setLoadingStaff(true)
    try {
      const data = await getDaftarStaf()
      setStaffList(Array.isArray(data?.items) ? data.items : [])
    } catch (err) {
      setStaffNotice({ type: 'error', text: err.message || 'Gagal memuat daftar akun staf.' })
    } finally {
      setLoadingStaff(false)
    }
  }

  useEffect(() => {
    loadStaff()
  }, [isSuperAdmin])

  function update(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    localStorage.setItem('inventaris_settings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleReset() {
    const yakin = window.confirm('Kembalikan semua pengaturan ke nilai awal?')
    if (!yakin) return

    setSettings(DEFAULT_SETTINGS)
    localStorage.setItem('inventaris_settings', JSON.stringify(DEFAULT_SETTINGS))
  }

  async function handleVerify(item, action) {
    if (action === 'reject') {
      const yakin = window.confirm(
        `Tolak permohonan akun "${item.nama}" (${item.username})?`
      )
      if (!yakin) return
    }

    setActionUserId(item.id_user)
    setStaffNotice({ type: '', text: '' })
    try {
      const res = await verifikasiStaf(item.id_user, action)
      setStaffNotice({ type: 'success', text: res.message })
      await loadStaff()
      window.dispatchEvent(new Event('staff-verification-updated'))
    } catch (err) {
      setStaffNotice({ type: 'error', text: err.message })
    } finally {
      setActionUserId(null)
    }
  }

  async function handleDeactivate(item) {
    const yakin = window.confirm(
      `Nonaktifkan akun staf "${item.nama}" (${item.username})?\n\nAkun ini tidak akan bisa login lagi, namun seluruh riwayat transaksinya tetap tersimpan.`
    )
    if (!yakin) return

    setActionUserId(item.id_user)
    setStaffNotice({ type: '', text: '' })
    try {
      const res = await nonaktifkanStaf(item.id_user)
      setStaffNotice({ type: 'success', text: res.message })
      await loadStaff()
      window.dispatchEvent(new Event('staff-verification-updated'))
    } catch (err) {
      setStaffNotice({ type: 'error', text: err.message })
    } finally {
      setActionUserId(null)
    }
  }

  const pendingUsers = staffList.filter((u) => u.status === 'pending' && u.is_deleted === 0)
  const processedUsers = staffList.filter((u) => u.status !== 'pending')

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
              <Settings size={19} />
            </div>
            <h1 className="text-xl font-semibold text-slate-800">Pengaturan</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 ml-11">
            Atur batas peringatan stok dan kedaluwarsa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw size={15} />
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700"
          >
            <Save size={15} />
            Simpan Pengaturan
          </button>
        </div>
      </div>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg px-4 py-3 text-xs font-medium">
          ✓ Pengaturan berhasil disimpan.
        </div>
      )}

      <SettingCard
        icon={AlertTriangle}
        title="Peringatan Stok"
        description="Tentukan batas stok yang dianggap kritis."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberInput
            label="Stok kritis gudang"
            value={settings.stokKritisGudang}
            onChange={(value) => update('stokKritisGudang', value)}
            suffix="pcs"
          />
          <NumberInput
            label="Stok kritis display"
            value={settings.stokKritisDisplay}
            onChange={(value) => update('stokKritisDisplay', value)}
            suffix="pcs"
          />
        </div>
      </SettingCard>

      <SettingCard
        icon={CalendarClock}
        title="Peringatan Kedaluwarsa"
        description="Tentukan kapan barang mulai muncul pada peringatan Dashboard."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberInput
            label="Mulai peringatan kedaluwarsa"
            value={settings.kadaluarsaBulan}
            onChange={(value) => update('kadaluarsaBulan', value)}
            suffix="bulan"
            min={1}
          />
          <NumberInput
            label="Peringatan kedaluwarsa mendesak"
            value={settings.kadaluarsaMendesakHari}
            onChange={(value) => update('kadaluarsaMendesakHari', value)}
            suffix="hari"
            min={1}
          />
        </div>
        <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg p-3">
          <p className="text-xs text-amber-700">
            Contoh: jika diatur <b>3 bulan</b>, setiap kloter dengan tanggal kedaluwarsa dalam sekitar 3 bulan akan muncul di Dashboard.
          </p>
        </div>
      </SettingCard>

      {isSuperAdmin && (
        <>
          {staffNotice.text && (
            <div
              className={`rounded-lg px-4 py-3 text-xs font-medium border ${
                staffNotice.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              {staffNotice.text}
            </div>
          )}

          <SettingCard
            icon={UserCheck}
            title="Verifikasi Pendaftaran Staf"
            description="Setujui atau tolak permohonan akun staf gudang baru sebelum dapat login."
            badge={
              pendingUsers.length > 0 ? (
                <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-semibold">
                  {pendingUsers.length} menunggu
                </span>
              ) : null
            }
          >
            {loadingStaff ? (
              <div className="flex items-center justify-center py-6 text-slate-400 text-xs gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span>Memuat permohonan akun...</span>
              </div>
            ) : pendingUsers.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Belum ada permohonan pendaftaran staf baru.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingUsers.map((item) => {
                  const busy = actionUserId === item.id_user
                  return (
                    <div
                      key={item.id_user}
                      className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">{item.nama}</p>
                        <p className="text-xs text-slate-500">
                          @{item.username} • Daftar {formatTanggal(String(item.created_at).slice(0, 10))}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleVerify(item, 'approve')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <Check size={14} />
                          Setujui
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleVerify(item, 'reject')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 disabled:opacity-50"
                        >
                          <X size={14} />
                          Tolak
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </SettingCard>

          <SettingCard
            icon={Users}
            title="Daftar Akun Staf Gudang"
            description="Nonaktifkan akun staf yang sudah resign atau tidak aktif. Riwayat transaksi lama tetap tersimpan."
          >
            {loadingStaff ? (
              <div className="flex items-center justify-center py-6 text-slate-400 text-xs gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span>Memuat daftar staf...</span>
              </div>
            ) : processedUsers.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Belum ada akun staf terdaftar.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {processedUsers.map((item) => {
                  const busy = actionUserId === item.id_user
                  const isAktif = item.status === 'aktif' && item.is_deleted === 0
                  const statusKey = isAktif ? 'aktif' : item.status
                  return (
                    <div
                      key={item.id_user}
                      className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {item.nama}
                            </p>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                                STATUS_STYLE[statusKey] || STATUS_STYLE.nonaktif
                              }`}
                            >
                              {STATUS_LABEL[statusKey] || 'Nonaktif'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            @{item.username} • {formatRoleLabel(item.role)}
                          </p>
                        </div>
                      </div>

                      {isAktif && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDeactivate(item)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition disabled:opacity-50 shrink-0 self-start sm:self-center"
                        >
                          <UserX size={14} />
                          Nonaktifkan
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </SettingCard>
        </>
      )}
    </div>
  )
}
