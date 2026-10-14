import { useEffect, useState } from 'react'
import {
  Settings,
  AlertTriangle,
  CalendarClock,
  Save,
  RotateCcw,
} from 'lucide-react'

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

function SettingCard({ icon: Icon, title, description, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="flex items-start gap-3 p-4 border-b border-slate-100">
        <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
          <Icon size={18} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>
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

export default function SettingsPage() {
  const [settings, setSettings] = useState(loadSettings)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSaved(false)
  }, [settings])

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
    </div>
  )
}
