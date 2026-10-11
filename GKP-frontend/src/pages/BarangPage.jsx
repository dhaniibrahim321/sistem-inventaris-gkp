import { useState } from 'react'
import { Search, Plus, Pencil, Trash2, PackageX } from 'lucide-react'
import { Button, Input, Select, Modal, Table, Badge } from '../components/common'
import { createBarang, updateBarang, deleteBarang } from '../services/barangService'
import { kategoriList } from '../services/data/barangData'
import { formatTanggal } from '../utils/dateHelpers'
import { getStokStatus, STATUS_ROW_CLASS } from '../utils/stokHelpers'

const emptyForm = {
  sku: '',
  nama: '',
  kategori: '',
  satuan: '',
  stokMinimum: '',
  kadaluarsa: '',
}

export default function BarangPage({ barang, setBarang }) {
  const [search, setSearch] = useState('')
  const [kategoriFilter, setKategoriFilter] = useState('')

  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})

  const [deleteTarget, setDeleteTarget] = useState(null)

  const filteredItems = barang.filter((item) => {
    const keyword = search.trim().toLowerCase()
    const matchSearch =
      !keyword ||
      item.nama.toLowerCase().includes(keyword) ||
      item.sku.toLowerCase().includes(keyword)
    const matchKategori = !kategoriFilter || item.kategori === kategoriFilter
    return matchSearch && matchKategori
  })

  function openAddModal() {
    setEditingId(null)
    setFormData(emptyForm)
    setFormErrors({})
    setFormModalOpen(true)
  }

  function openEditModal(item) {
    setEditingId(item.id)
    setFormData({
      sku: item.sku,
      nama: item.nama,
      kategori: item.kategori,
      satuan: item.satuan,
      stokMinimum: String(item.stokMinimum),
      kadaluarsa: item.kadaluarsa,
    })
    setFormErrors({})
    setFormModalOpen(true)
  }

  function closeFormModal() {
    setFormModalOpen(false)
  }

  function handleFormChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  function validateForm() {
    const errors = {}
    if (!formData.sku.trim()) errors.sku = 'SKU wajib diisi.'
    if (!formData.nama.trim()) errors.nama = 'Nama barang wajib diisi.'
    if (!formData.kategori) errors.kategori = 'Kategori wajib dipilih.'
    if (!formData.satuan.trim()) errors.satuan = 'Satuan wajib diisi.'
    if (formData.stokMinimum === '' || Number(formData.stokMinimum) < 0) {
      errors.stokMinimum = 'Stok minimum wajib diisi dengan angka valid.'
    }
    return errors
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    const payload = {
      sku: formData.sku.trim(),
      nama: formData.nama.trim(),
      kategori: formData.kategori,
      satuan: formData.satuan.trim(),
      stokMinimum: Number(formData.stokMinimum),
      kadaluarsa: formData.kadaluarsa,
    }

    if (editingId) {
      setBarang((prev) => updateBarang(prev, editingId, payload))
    } else {
      setBarang((prev) => [createBarang(payload, prev), ...prev])
    }

    setFormModalOpen(false)
  }

  function confirmDelete() {
    setBarang((prev) => deleteBarang(prev, deleteTarget.id))
    setDeleteTarget(null)
  }

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
    { key: 'stokMinimum', label: 'Stok Min.' },
    {
      key: 'kadaluarsa',
      label: 'Kadaluarsa',
      render: (value) => formatTanggal(value),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => openEditModal(row)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            aria-label={`Edit ${row.nama}`}
            title="Edit"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            aria-label={`Hapus ${row.nama}`}
            title="Hapus"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ]

  function rowClassName(row) {
    return STATUS_ROW_CLASS[getStokStatus(row)]
  }

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Kelola Data Barang</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola data barang, kategori, dan ambang batas stok minimum.
          </p>
        </div>
        <Button onClick={openAddModal}>
          <Plus size={16} className="mr-1.5" />
          Tambah Barang
        </Button>
      </header>

      {/* Toolbar: Search & Filter */}
      <section aria-label="Pencarian dan filter barang" className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <label htmlFor="search-barang" className="sr-only">Cari nama barang atau SKU</label>
          <input
            id="search-barang"
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
      <section aria-label="Daftar barang">
        <Table columns={columns} data={filteredItems} rowClassName={rowClassName} />
      </section>

      {/* Modal Tambah / Edit */}
      <Modal
        isOpen={formModalOpen}
        onClose={closeFormModal}
        title={editingId ? 'Edit Barang' : 'Tambah Barang'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="SKU"
            name="sku"
            value={formData.sku}
            onChange={handleFormChange}
            error={formErrors.sku}
            placeholder="Contoh: SKC-041"
          />
          <Input
            label="Nama Barang"
            name="nama"
            value={formData.nama}
            onChange={handleFormChange}
            error={formErrors.nama}
            placeholder="Contoh: Serum Vitamin C 30ml"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Kategori"
              name="kategori"
              value={formData.kategori}
              onChange={handleFormChange}
              error={formErrors.kategori}
              placeholder="Pilih kategori"
              options={kategoriList.map((k) => ({ value: k, label: k }))}
            />
            <Input
              label="Satuan"
              name="satuan"
              value={formData.satuan}
              onChange={handleFormChange}
              error={formErrors.satuan}
              placeholder="Contoh: pcs, botol"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Stok Minimum"
              name="stokMinimum"
              type="number"
              value={formData.stokMinimum}
              onChange={handleFormChange}
              error={formErrors.stokMinimum}
              placeholder="0"
            />
            <Input
              label="Tanggal Kadaluarsa (opsional)"
              name="kadaluarsa"
              type="date"
              value={formData.kadaluarsa}
              onChange={handleFormChange}
            />
          </div>

          {!editingId && (
            <p className="text-xs text-slate-400">
              Stok gudang & stok display barang baru dimulai dari 0, diisi melalui halaman Barang Masuk.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeFormModal}>
              Batal
            </Button>
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Konfirmasi Hapus */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Barang"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-red-50 text-red-600 shrink-0">
              <PackageX size={18} />
            </div>
            <p className="text-sm text-slate-600">
              Yakin ingin menghapus <span className="font-medium text-slate-800">{deleteTarget?.nama}</span>{' '}
              ({deleteTarget?.sku})? Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Hapus
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
