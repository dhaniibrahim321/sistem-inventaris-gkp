import { useState } from 'react'
import { Search } from 'lucide-react'
import { Select, Table, Badge } from '../components/common'
import { kategoriList } from '../services/data/barangData'
import { formatTanggal } from '../utils/dateHelpers'
import { getStokStatus, STATUS_ROW_CLASS } from '../utils/stokHelpers'

const statusOptions = [
  { value: 'kritis', label: 'Stok Kritis' },
  { value: 'kadaluarsa', label: 'Mendekati Kedaluwarsa' },
  { value: 'aman', label: 'Aman' },
]

const statusBadge = {
  kritis: <Badge variant="danger">Stok Kritis</Badge>,
  kadaluarsa: <Badge variant="warning">Mendekati Kedaluwarsa</Badge>,
  aman: <Badge variant="success">Aman</Badge>,
}

export default function StokPage({ barang }) {
  const [search, setSearch] = useState('')
  const [kategoriFilter, setKategoriFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const rows = barang.map((item) => ({ ...item, status: getStokStatus(item) }))

  const filteredRows = rows.filter((item) => {
    const keyword = search.trim().toLowerCase()
    const matchSearch =
      !keyword ||
      item.nama.toLowerCase().includes(keyword) ||
      item.sku.toLowerCase().includes(keyword)
    const matchKategori = !kategoriFilter || item.kategori === kategoriFilter
    const matchStatus = !statusFilter || item.status === statusFilter
    return matchSearch && matchKategori && matchStatus
  })

  const totalKritis = rows.filter((r) => r.status === 'kritis').length
  const totalKadaluarsa = rows.filter((r) => r.status === 'kadaluarsa').length

  const columns = [
    { key: 'sku', label: 'SKU' },
    { key: 'nama', label: 'Nama Barang' },
    {
      key: 'kategori',
      label: 'Kategori',
      render: (value) => <Badge variant="default">{value}</Badge>,
    },
    {
      key: 'stokGudang',
      label: 'Stok Gudang',
      render: (value, row) => `${value} ${row.satuan}`,
    },
    {
      key: 'stokDisplay',
      label: 'Stok Display',
      render: (value, row) => `${value} ${row.satuan}`,
    },
    {
      key: 'totalStok',
      label: 'Total Stok',
      render: (_, row) => `${row.stokGudang + row.stokDisplay} ${row.satuan}`,
    },
    { key: 'stokMinimum', label: 'Stok Min.' },
    {
      key: 'kadaluarsa',
      label: 'Kadaluarsa',
      render: (value) => formatTanggal(value),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => statusBadge[value],
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Monitoring Stok Barang</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pantau kondisi stok gudang dan display secara real-time.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-medium">
            {totalKritis} kritis
          </span>
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
            {totalKadaluarsa} mendekati kedaluwarsa
          </span>
        </div>
      </header>

      {/* Toolbar: Search & Filter */}
      <section aria-label="Pencarian dan filter stok" className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <label htmlFor="search-stok" className="sr-only">Cari nama barang atau SKU</label>
          <input
            id="search-stok"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama barang atau SKU..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
          />
        </div>
        <Select
          name="kategoriFilter"
          value={kategoriFilter}
          onChange={(e) => setKategoriFilter(e.target.value)}
          placeholder="Semua Kategori"
          options={kategoriList.map((k) => ({ value: k, label: k }))}
          className="sm:w-52"
        />
        <Select
          name="statusFilter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          placeholder="Semua Status"
          options={statusOptions}
          className="sm:w-56"
        />
      </section>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-300" /> Stok kritis (≤ minimum)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-300" /> Mendekati kedaluwarsa (≤ 30 hari)
        </span>
      </div>

      {/* Table */}
      <section aria-label="Tabel monitoring stok">
        <Table
          columns={columns}
          data={filteredRows}
          rowClassName={(row) => STATUS_ROW_CLASS[row.status]}
        />
      </section>
    </div>
  )
}
