import { useState } from 'react'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ImagePlus,
  AlertTriangle,
  Package,
} from 'lucide-react'

import { Button, Input, Modal } from '../components/common'

import {
  tambahBarang,
  editBarang,
  hapusBarang,
} from '../services/api'

import {
  getBrandList,
  samakanBrand,
} from '../utils/brandHelpers'

const emptyForm = {
  sku: '',
  nama: '',
  varian: '',
  brand: '',
  gambar: '',
}

const focusClass =
  'focus:outline-none focus:ring-2 focus:ring-[#8A7CD9] focus:border-[#8A7CD9]'

export default function BarangPage({ barang, refreshData }) {
  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState('')

  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [formData, setFormData] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})

  const [deleteTarget, setDeleteTarget] = useState(null)

  // Daftar brand diturunkan langsung dari barang yang sudah ada
  const brandTersedia = getBrandList(barang)

  const filterAktif = brandTersedia.includes(brandFilter)
    ? brandFilter
    : ''

  const filteredItems = barang.filter((item) => {
    const keyword = search.trim().toLowerCase()

    const matchSearch =
      !keyword ||
      String(item.nama ?? '').toLowerCase().includes(keyword) ||
      String(item.varian ?? '').toLowerCase().includes(keyword) ||
      String(item.brand ?? '').toLowerCase().includes(keyword) ||
      String(item.sku ?? '').toLowerCase().includes(keyword)

    const matchBrand = !filterAktif || item.brand === filterAktif

    return matchSearch && matchBrand
  })

  function openAddModal() {
    setEditingId(null)
    setFormData(emptyForm)
    setFormErrors({})
    setFormModalOpen(true)
  }

  function handleTambahVarian(item) {
    setEditingId(null)
    setFormData({
      sku: '',
      nama: item.nama || '',
      varian: '',
      brand: item.brand || '',
      gambar: item.gambar || '',
    })
    setFormErrors({})
    setFormModalOpen(true)
  }

  function openEditModal(item) {
    setEditingId(item.id)

    setFormData({
      sku: item.sku || '',
      nama: item.nama || '',
      varian: item.varian || '',
      brand: item.brand || '',
      gambar: item.gambar || '',
    })

    setFormErrors({})
    setFormModalOpen(true)
  }

  function closeFormModal() {
    setFormModalOpen(false)
    setEditingId(null)
    setFormData(emptyForm)
    setFormErrors({})
  }

  function handleFormChange(e) {
    const { name, value } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0]

    if (!file) return

    const isJpgType = file.type === 'image/jpeg' || file.type === 'image/jpg'
    const isJpgExt = /\.(jpe?g)$/i.test(file.name)

    if (!isJpgType || !isJpgExt) {
      e.target.value = ''
      setFormErrors((prev) => ({
        ...prev,
        gambar: 'Format gambar harus JPG atau JPEG (.jpg / .jpeg).',
      }))
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      e.target.value = ''
      setFormErrors((prev) => ({
        ...prev,
        gambar: 'Ukuran gambar maksimal 2 MB.',
      }))
      return
    }

    const reader = new FileReader()

    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        gambar: reader.result,
      }))

      setFormErrors((prev) => ({
        ...prev,
        gambar: '',
      }))
    }

    reader.readAsDataURL(file)
  }

  function validateForm() {
    const errors = {}

    if (!formData.sku.trim()) {
      errors.sku = 'SKU wajib diisi.'
    }

    if (!formData.nama.trim()) {
      errors.nama = 'Nama barang wajib diisi.'
    }

    const duplicateSku = barang.some(
      (item) =>
        String(item.sku ?? '').toLowerCase() ===
          formData.sku.trim().toLowerCase() && item.id !== editingId
    )

    if (duplicateSku) {
      errors.sku = 'SKU sudah digunakan oleh barang lain.'
    }

    return errors
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const errors = validateForm()

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    const payload = {
      sku: formData.sku.trim(),
      nama_barang: formData.nama.trim(),
      varian: formData.varian ? formData.varian.trim() : '',
      brand: samakanBrand(formData.brand, barang),
      foto_url: formData.gambar || '',
    }

    try {
      if (editingId !== null) {
        await editBarang(editingId, payload)
        alert('Barang berhasil diperbarui!')
      } else {
        await tambahBarang(payload)
        alert('Barang berhasil ditambahkan!')
      }

      await refreshData()
      closeFormModal()
    } catch (error) {
      console.error('Gagal menyimpan barang:', error)
      alert(error.message)
    }
  }

  function openDeleteModal(item) {
    setDeleteTarget(item)
  }

  function closeDeleteModal() {
    setDeleteTarget(null)
  }

  async function confirmDelete() {
    if (!deleteTarget) return

    try {
      await hapusBarang(deleteTarget.id)
      await refreshData()

      alert('Barang berhasil dihapus!')
      setDeleteTarget(null)
    } catch (error) {
      console.error('Gagal menghapus barang:', error)
      alert(error.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Kelola Data Barang
          </h1>

          <p className="text-sm text-slate-500 mt-0.5">
            Kelola data barang, varian produk, dan brand.
          </p>
        </div>

        <Button onClick={openAddModal}>
          <Plus size={16} className="mr-1.5" />
          Tambah Barang
        </Button>
      </header>

      {/* PENCARIAN & FILTER */}
      <section
        aria-label="Pencarian dan filter barang"
        className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <label htmlFor="search-barang" className="sr-only">
            Cari nama barang, varian, brand, atau SKU
          </label>

          <input
            id="search-barang"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama barang, varian, brand, atau SKU..."
            className={`w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm ${focusClass}`}
          />
        </div>

        <div className="sm:w-52">
          <label htmlFor="brandFilter" className="sr-only">
            Filter brand produk
          </label>
          <select
            id="brandFilter"
            value={filterAktif}
            onChange={(e) => setBrandFilter(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white ${focusClass}`}
          >
            <option value="">Semua Brand</option>
            {brandTersedia.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* DAFTAR BARANG (KARTU) */}
      <section aria-label="Daftar barang">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
            <Package size={40} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              {barang.length === 0
                ? 'Belum ada data barang. Klik "Tambah Barang" untuk mulai.'
                : 'Barang tidak ditemukan.'}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredItems.map((item, index) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-[#C2B6FE]/60 bg-[#EDEAFF]/60 p-3 shadow-xs transition hover:border-[#8A7CD9] hover:bg-[#EDEAFF]"
              >
                {/* FOTO PRODUK (ukuran ringkas 56x56 seperti Pencatatan & Pergerakan) */}
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white bg-white flex items-center justify-center">
                  {item.gambar ? (
                    <img
                      src={item.gambar}
                      alt={item.nama}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package size={24} className="text-slate-300" />
                  )}
                  <span
                    className="absolute left-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#5B528D]/85 px-1 text-[10px] font-semibold text-white"
                    title="Nomor urut"
                  >
                    {index + 1}
                  </span>
                </div>

                {/* INFO PRODUK */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p
                      className="truncate text-sm font-semibold text-slate-800"
                      title={item.nama}
                    >
                      {item.nama}
                    </p>
                    {item.varian && (
                      <span className="shrink-0 rounded bg-[#8A7CD9]/20 px-1.5 py-0.5 text-[10px] font-medium text-[#5B528D]">
                        {item.varian}
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    SKU: {item.sku} • Brand: {item.brand || '-'}
                  </p>
                </div>

                {/* AKSI */}
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleTambahVarian(item)}
                    className="flex items-center gap-0.5 rounded-lg bg-white px-2 py-1.5 text-[11px] font-medium text-[#5B528D] shadow-xs transition-colors hover:bg-[#8A7CD9] hover:text-white"
                    title="Tambah Varian Baru untuk Produk Ini"
                  >
                    <Plus size={12} />
                    <span>Varian</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white hover:text-[#5B528D]"
                    aria-label={`Edit ${item.nama}`}
                    title="Edit Barang"
                  >
                    <Pencil size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => openDeleteModal(item)}
                    className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white hover:text-red-600"
                    aria-label={`Hapus ${item.nama}`}
                    title="Hapus Barang"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* MODAL TAMBAH / EDIT */}
      <Modal
        isOpen={formModalOpen}
        onClose={closeFormModal}
        title={editingId !== null ? 'Edit Barang' : 'Tambah Barang'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="SKU"
            name="sku"
            value={formData.sku}
            onChange={handleFormChange}
            error={formErrors.sku}
            placeholder="Ketik SKU barang"
          />

          <Input
            label="Nama Barang"
            name="nama"
            value={formData.nama}
            onChange={handleFormChange}
            error={formErrors.nama}
            placeholder="Contoh: Lipstik Matte, Serum Wajah"
          />

          <Input
            label="Varian Produk"
            name="varian"
            value={formData.varian}
            onChange={handleFormChange}
            error={formErrors.varian}
            placeholder="Contoh: Merah 01, Nude, Pink, 30ml (Opsional)"
          />

          {/* BRAND: diketik sendiri dengan saran dari brand yang sudah ada */}
          <div>
            <label
              htmlFor="brand"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Brand
            </label>
            <input
              id="brand"
              name="brand"
              type="text"
              list="daftar-brand"
              autoComplete="off"
              value={formData.brand}
              onChange={handleFormChange}
              placeholder="Contoh: Wardah, Emina, Somethinc (Opsional)"
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                formErrors.brand
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-slate-300 focus:ring-[#8A7CD9] focus:border-[#8A7CD9]'
              }`}
            />
            <datalist id="daftar-brand">
              {brandTersedia.map((brand) => (
                <option key={brand} value={brand} />
              ))}
            </datalist>
            {formErrors.brand && (
              <p className="mt-1 text-sm text-red-600">{formErrors.brand}</p>
            )}
          </div>

          {/* FOTO BARANG */}
          <div>
            <label
              htmlFor="gambar-barang"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Foto Barang
            </label>

            <label
              htmlFor="gambar-barang"
              className="flex flex-col items-center justify-center w-full min-h-36 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-[#8A7CD9] transition-colors overflow-hidden"
            >
              {formData.gambar ? (
                <div className="relative w-full">
                  <img
                    src={formData.gambar}
                    alt="Pratinjau foto barang"
                    className="w-full h-48 object-contain bg-white"
                  />

                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/90 text-xs text-slate-600 px-3 py-1 rounded-full shadow-sm">
                    Klik untuk mengganti foto
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="w-12 h-12 rounded-full bg-[#EDEAFF] text-[#5B528D] flex items-center justify-center mb-3">
                    <ImagePlus size={22} />
                  </div>

                  <p className="text-sm font-medium text-slate-700">
                    Tambah Foto Barang
                  </p>

                  <p className="text-xs text-slate-400 mt-1">
                    Hanya file JPG / JPEG maksimal 2 MB
                  </p>
                </div>
              )}

              <input
                id="gambar-barang"
                name="gambar"
                type="file"
                accept=".jpg,.jpeg,image/jpeg"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>

            {formErrors.gambar && (
              <p className="mt-1 text-sm text-red-600">{formErrors.gambar}</p>
            )}
          </div>

          {editingId === null && (
            <p className="text-xs text-slate-400">
              Jumlah stok barang akan dicatat melalui halaman Pencatatan
              Barang.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeFormModal}>
              Batal
            </Button>

            <Button type="submit">
              {editingId !== null ? 'Simpan Perubahan' : 'Tambah Barang'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL KONFIRMASI HAPUS */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={closeDeleteModal}
        title="Hapus Barang"
        size="sm"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>

            <div>
              <p className="text-sm font-medium text-slate-800">
                Apakah benar akan menghapus barang ini?
              </p>

              {deleteTarget && (
                <p className="text-sm text-slate-500 mt-1">
                  Barang{' '}
                  <span className="font-medium text-slate-700">
                    {deleteTarget.nama}
                  </span>{' '}
                  ({deleteTarget.sku}) akan dihapus.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeDeleteModal}>
              Batal
            </Button>

            <Button type="button" variant="danger" onClick={confirmDelete}>
              Hapus
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
