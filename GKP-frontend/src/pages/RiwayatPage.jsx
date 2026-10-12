import { useState } from 'react'
import { Search } from 'lucide-react'
import { Select, Badge, Table } from '../components/common'
import { sortRiwayatTerbaru } from '../services/riwayatService'
import { jenisAktivitasList } from '../services/data/riwayatData'
import { formatTanggal } from '../utils/dateHelpers'

const jenisBadge = {
  masuk: <Badge variant="success">Barang Masuk</Badge>,
  pergerakan: <Badge variant="default">Pergerakan</Badge>,
  opname: <Badge variant="warning">Stock Opname</Badge>,
}

export default function RiwayatPage({ riwayat }) {
  const [tanggalMulai, setTanggalMulai] = useState('')
  const [tanggalAkhir, setTanggalAkhir] = useState('')
  const [jenisFilter, setJenisFilter] = useState('')
  const [skuFilter, setSkuFilter] = useState('')

  const filteredLog = sortRiwayatTerbaru(riwayat).filter((log) => {
    const matchMulai = !tanggalMulai || log.tanggal >= tanggalMulai
    const matchAkhir = !tanggalAkhir || log.tanggal <= tanggalAkhir
    const matchJenis = !jenisFilter || log.jenis === jenisFilter
    const matchSku =
      !skuFilter.trim() ||
      log.sku.toLowerCase().includes(skuFilter.trim().toLowerCase()) ||
      log.nama.toLowerCase().includes(skuFilter.trim().toLowerCase())
    return matchMulai && matchAkhir && matchJenis && matchSku
  })

  function resetFilter() {
    setTanggalMulai('')
    setTanggalAkhir('')
    setJenisFilter('')
    setSkuFilter('')
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
      render: (value) => jenisBadge[value],
    },
    { key: 'sku', label: 'SKU' },
    { key: 'nama', label: 'Nama Barang' },
    { key: 'keterangan', label: 'Keterangan' },
    { key: 'oleh', label: 'Oleh' },
  ]

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <header>
        <h1 className="text-xl font-semibold text-slate-800">Riwayat Aktivitas</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Audit trail seluruh transaksi barang masuk, pergerakan, dan stock opname.
        </p>
      </header>

      {/* Toolbar: Filter Multi-parameter */}
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
                onChange={(e) => setSkuFilter(e.target.value)}
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

      {/* Table */}
      <section aria-label="Tabel riwayat aktivitas">
        <Table columns={columns} data={filteredLog} />
      </section>
    </div>
  )
}
