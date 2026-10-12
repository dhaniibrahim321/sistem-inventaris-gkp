import {
  Package,
  Warehouse,
  Store,
  Layers,
  AlertTriangle,
  Clock,
  PackagePlus,
  ArrowLeftRight,
  ClipboardCheck,
} from 'lucide-react'
import { formatTanggal, sisaHari } from '../utils/dateHelpers'
import { isStokKritis, isMendekatiKadaluarsa } from '../utils/stokHelpers'
import { sortRiwayatTerbaru } from '../services/riwayatService'

const accentClasses = {
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-600',
}

const activityIcon = {
  masuk: { icon: PackagePlus, className: 'bg-emerald-50 text-emerald-600' },
  pergerakan: { icon: ArrowLeftRight, className: 'bg-slate-100 text-slate-600' },
  opname: { icon: ClipboardCheck, className: 'bg-amber-50 text-amber-600' },
}

export default function DashboardPage({ barang, riwayat }) {
  const activityFeed = sortRiwayatTerbaru(riwayat).slice(0, 5)

  const stokKritis = barang.filter(isStokKritis)
  const kadaluarsa = barang
    .filter((item) => isMendekatiKadaluarsa(item))
    .map((item) => ({ ...item, sisa: sisaHari(item.kadaluarsa) }))
    .sort((a, b) => a.sisa - b.sisa)

  const totalJenis = barang.length
  const totalGudang = barang.reduce((sum, item) => sum + item.stokGudang, 0)
  const totalDisplay = barang.reduce((sum, item) => sum + item.stokDisplay, 0)

  const statCards = [
    { label: 'Total Jenis Barang', value: totalJenis, unit: 'SKU', icon: Package, accent: 'rose' },
    { label: 'Total Stok Gudang', value: totalGudang, unit: 'pcs', icon: Warehouse, accent: 'slate' },
    { label: 'Total Stok Display', value: totalDisplay, unit: 'pcs', icon: Store, accent: 'slate' },
    { label: 'Total Keseluruhan', value: totalGudang + totalDisplay, unit: 'pcs', icon: Layers, accent: 'rose' },
  ]

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <header>
        <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Ringkasan kondisi inventaris gudang hari ini.
        </p>
      </header>

      {/* Stat Cards */}
      <section aria-label="Ringkasan statistik stok" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-start justify-between"
          >
            <div>
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="text-2xl font-bold text-slate-800 mt-1.5">
                {card.value.toLocaleString('id-ID')}
                <span className="text-sm font-medium text-slate-400 ml-1">{card.unit}</span>
              </p>
            </div>
            <div className={`p-2.5 rounded-lg ${accentClasses[card.accent]}`}>
              <card.icon size={20} />
            </div>
          </div>
        ))}
      </section>

      {/* Alerts + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Alert Panels */}
        <div className="lg:col-span-2 space-y-6">
          {/* Panel Stok Kritis */}
          <section aria-labelledby="heading-stok-kritis" className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200">
              <AlertTriangle size={18} className="text-rose-600" />
              <h2 id="heading-stok-kritis" className="text-sm font-semibold text-slate-800">Peringatan Stok Kritis</h2>
              <span className="ml-auto text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                {stokKritis.length} item
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {stokKritis.length > 0 ? (
                stokKritis.map((item) => (
                  <div
                    key={item.sku}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 border-l-4 border-rose-500 bg-rose-50/40"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{item.nama}</p>
                      <p className="text-xs text-slate-500">{item.sku}</p>
                    </div>
                    <p className="text-sm font-semibold text-rose-600 whitespace-nowrap">
                      {item.stokGudang} / {item.stokMinimum} pcs
                    </p>
                  </div>
                ))
              ) : (
                <p className="px-5 py-6 text-sm text-slate-400 text-center">
                  Tidak ada barang dengan stok kritis.
                </p>
              )}
            </div>
          </section>

          {/* Panel Kadaluarsa */}
          <section aria-labelledby="heading-kadaluarsa" className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200">
              <Clock size={18} className="text-amber-600" />
              <h2 id="heading-kadaluarsa" className="text-sm font-semibold text-slate-800">Mendekati Kedaluwarsa</h2>
              <span className="ml-auto text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                {kadaluarsa.length} item
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {kadaluarsa.length > 0 ? (
                kadaluarsa.map((item) => (
                  <div
                    key={item.sku}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 border-l-4 border-amber-400 bg-amber-50/40"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{item.nama}</p>
                      <p className="text-xs text-slate-500">
                        {item.sku} &middot; Exp. {formatTanggal(item.kadaluarsa)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-amber-700 whitespace-nowrap">
                      {item.sisa} hari lagi
                    </p>
                  </div>
                ))
              ) : (
                <p className="px-5 py-6 text-sm text-slate-400 text-center">
                  Tidak ada barang yang mendekati kedaluwarsa.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Right: Activity Feed */}
        <section aria-labelledby="heading-aktivitas" className="bg-white rounded-xl border border-slate-200 shadow-sm lg:col-span-1">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 id="heading-aktivitas" className="text-sm font-semibold text-slate-800">Aktivitas Terbaru</h2>
          </div>
          <div className="px-5 py-4 space-y-5">
            {activityFeed.length > 0 ? (
              activityFeed.map((log) => {
                const meta = activityIcon[log.jenis]
                return (
                  <div key={log.id} className="flex gap-3">
                    <div className={`shrink-0 p-1.5 rounded-full h-fit ${meta.className}`}>
                      <meta.icon size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 leading-snug">
                        {log.nama}: {log.keterangan}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {log.oleh} &middot; {formatTanggal(log.tanggal)}, {log.waktu}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">Belum ada aktivitas.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
