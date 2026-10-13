import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Select, Badge, Table } from '../components/common'
import { sortRiwayatTerbaru } from '../services/riwayatService'
import { jenisAktivitasList } from '../services/data/riwayatData'
import { formatTanggal } from '../utils/dateHelpers'

const jenisBadge = {
  barang: <Badge variant="info">Kelola Data Barang</Badge>,
  masuk: <Badge variant="success">Barang Masuk</Badge>,
  pergerakan: <Badge variant="default">Pergerakan Barang</Badge>,
  stok: <Badge variant="purple">Penyesuaian Stok</Badge>,
  opname: <Badge variant="warning">Stok Opname</Badge>,
}

export default function RiwayatPage({ riwayat }) {
  const { state: lokasiState } = useLocation()
  const asal = lokasiState?.dariDashboard ? lokasiState : null

  const [tanggalMulai, setTanggalMulai] = useState(asal?.tanggalMulai ?? '')
  const [tanggalAkhir, setTanggalAkhir] = useState(asal?.tanggalAkhir ?? '')
  const [jenisFilter, setJenisFilter] = useState(asal?.jenis ?? '')
  const [skuFilter, setSkuFilter] = useState(asal?.sku ?? '')
  const [dariDashboard, setDariDashboard] = useState(Boolean(asal))
  const [skuPersis, setSkuPersis] = useState(asal?.sku ?? '')

  const filteredLog = sortRiwayatTerbaru(riwayat).filter((log) => {
    const tgl = dariDashboard ? log.tanggalTransaksi || log.tanggal : log.tanggal
    const matchMulai = !tanggalMulai || tgl >= tanggalMulai
    const matchAkhir = !tanggalAkhir || tgl <= tanggalAkhir
    const matchJenis = !jenisFilter || log.jenis === jenisFilter
    const keyword = skuFilter.trim().toLowerCase()
    const matchSku = skuPersis
      ? log.sku === skuPersis
      : !keyword ||
        String(log.sku ?? '').toLowerCase().includes(keyword) ||
        String(log.nama ?? '').toLowerCase().includes(keyword)
    return matchMulai && matchAkhir && matchJenis && matchSku
  })

  function resetFilter() {
    setTanggalMulai('')
    setTanggalAkhir('')
    setJenisFilter('')
    setSkuFilter('')
    setSkuPersis('')
    setDariDashboard(false)
  }

  const filterActive = tanggalMulai || tanggalAkhir || jenisFilter || skuFilter

  const columns = [
    {
      key: 'tanggal',
      label: 'Tanggal',
      render: (value) => formatTanggal(value),
    },
    { key: 'waktu', label: 'Waktu' },
    {
      key: 'jenis',
      label: 'Jenis Aktivitas',
      render: (value) => jenisBadge[value] ?? value,
    },
    { key: 'sku', label: 'SKU' },
    { key: 'nama', label: 'Nama Barang' },
    { key: 'keterangan', label: 'Keterangan' },
    { key: 'oleh', label: 'Oleh' },
  ]

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-800">Riwayat Aktivitas</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Catatan seluruh aktivitas: kelola data barang, barang masuk, pergerakan barang,
          penyesuaian stok, dan stok opname.
        </p>
      </header>

      <section aria-label="Filter riwayat aktivitas" className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="riwayat-dari" className="block text-sm font-medium text-slate-700 mb-1">Dari Tanggal</label>
            <input
              id="riwayat-dari"
              type="date"
              value={tanggalMulai}
              onChange={(e) => setTanggalMulai(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>
          <div>
            <label htmlFor="riwayat-sampai" className="block text-sm font-medium text-slate-700 mb-1">Sampai Tanggal</label>
            <input
              id="riwayat-sampai"
              type="date"
              value={tanggalAkhir}
              onChange={(e) => setTanggalAkhir(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>
          <Select
            label="Jenis Aktivitas"
            name="jenisFilter"
            value={jenisFilter}
            onChange={(e) => setJenisFilter(e.target.value)}
            placeholder="Semua Jenis"
            options={jenisAktivitasList}
          />
          <div>
            <label htmlFor="riwayat-sku" className="block text-sm font-medium text-slate-700 mb-1">SKU / Nama Barang</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="riwayat-sku"
                type="text"
                value={skuFilter}
                onChange={(e) => {
                  setSkuFilter(e.target.value)
                  setSkuPersis('')
                }}
                placeholder="Cari SKU / nama..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>
          </div>
        </div>

        {filterActive && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={resetFilter}
              className="text-xs font-medium text-rose-600 hover:text-rose-700"
            >
              Reset Filter
            </button>
          </div>
        )}
      </section>

      {dariDashboard && (
        <p className="rounded-lg bg-[#EDEAFF] px-3 py-2 text-xs text-[#5B528D]">
          Menampilkan {filteredLog.length} aktivitas dari Dashboard (
          {jenisFilter === 'masuk'
            ? 'Perputaran Barang Gudang'
            : 'Perputaran Barang Display'}
          ). Tekan "Reset Filter" untuk melihat semua aktivitas.
        </p>
      )}

      <section aria-label="Tabel riwayat aktivitas">
        <Table columns={columns} data={filteredLog} />
      </section>
    </div>
  )
}
