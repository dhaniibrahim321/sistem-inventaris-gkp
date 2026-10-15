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
  createBarang,
  updateBarang,
  deleteBarang,
} from '../services/barangService'

import {
  buatEntriRiwayat,
  tambahRiwayat,
} from '../services/riwayatService'

import {
  getKategoriList,
  samakanKategori,
} from '../utils/kategoriHelpers'

const emptyForm = {
  sku: '',
  nama: '',
  kategori: '',
  gambar: '',
}

const focusClass =
  'focus:outline-none focus:ring-2 focus:ring-[#8A7CD9] focus:border-[#8A7CD9]'

export default function BarangPage({ barang, setBarang, setRiwayat }) {
  const [search, setSearch] = useState('')
  const [kategoriFilter, setKategoriFilter] = useState('')

  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [formData, setFormData] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})

  const [deleteTarget, setDeleteTarget] = useState(null)

  // Kategori tidak punya daftar bawaan: seluruhnya berasal dari yang pernah
  // diketik user pada barang.
  const kategoriTersedia = getKategoriList(barang)

  // Jika kategori yang sedang difilter sudah tidak dipakai barang mana pun
  // (mis. barangnya dihapus), filter dianggap "Semua Kategori".
  const filterAktif = kategoriTersedia.includes(kategoriFilter)
    ? kategoriFilter
    : ''

  const filteredItems = barang.filter((item) => {
    const keyword = search.trim().toLowerCase()

    const matchSearch =
      !keyword ||
      String(item.nama ?? '').toLowerCase().includes(keyword) ||
      String(item.sku ?? '').toLowerCase().includes(keyword)

    const matchKategori = !filterAktif || item.kategori === filterAktif

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
      sku: item.sku || '',
      nama: item.nama || '',
      kategori: item.kategori || '',
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

    if (!file.type.startsWith('image/')) {
      setFormErrors((prev) => ({
        ...prev,
        gambar: 'File yang dipilih harus berupa gambar.',
      }))
      return
    }

    if (file.size > 2 * 1024 * 1024) {
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

    if (!formData.kategori.trim()) {
      errors.kategori = 'Kategori barang wajib diisi.'
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
      kategori: samakanKategori(formData.kategori, barang),
      gambar: formData.gambar,
    }

    // EDIT BARANG
    if (editingId !== null) {
      const barangLama = barang.find((item) => item.id === editingId)

      setBarang((prev) => updateBarang(prev, editingId, payload))

      // Catat aktivitas edit (hanya jika ada field yang benar-benar berubah)
      if (setRiwayat && barangLama) {
        const perubahan = []

        if (barangLama.sku !== payload.sku) {
          perubahan.push(`SKU "${barangLama.sku}" → "${payload.sku}"`)
        }
        if (barangLama.nama !== payload.nama) {
          perubahan.push(`Nama "${barangLama.nama}" → "${payload.nama}"`)
        }
        if (barangLama.kategori !== payload.kategori) {
          perubahan.push(
            `Kategori "${barangLama.kategori}" → "${payload.kategori}"`
          )
        }
        if ((barangLama.gambar || '') !== (payload.gambar || '')) {
          perubahan.push('Foto barang diganti')
        }

        if (perubahan.length > 0) {
          setRiwayat((prev) =>
            tambahRiwayat(
              prev,
              buatEntriRiwayat({
                jenis: 'barang',
                sku: payload.sku,
                nama: payload.nama,
                keterangan: `Data barang diperbarui. ${perubahan.join('; ')}.`,
              })
            )
          )
        }
      }
    }

    // TAMBAH BARANG BARU
    else {
      const barangBaru = createBarang(payload, barang)

      setBarang((prev) => [barangBaru, ...prev])

      if (setRiwayat) {
        setRiwayat((prev) =>
          tambahRiwayat(
            prev,
            buatEntriRiwayat({
              jenis: 'barang',
              sku: barangBaru.sku,
              nama: barangBaru.nama,
              keterangan:
                `Barang baru ditambahkan ke Kelola Data Barang. ` +
                `Kategori: ${barangBaru.kategori}.`,
            })
          )
        )
      }
    }

    closeFormModal()
  }

  function openDeleteModal(item) {
    setDeleteTarget(item)
  }

  function closeDeleteModal() {
    setDeleteTarget(null)
  }

  function confirmDelete() {
    if (!deleteTarget) return

    setBarang((prev) => deleteBarang(prev, deleteTarget.id))

    if (setRiwayat) {
      const sisaGudang = Number(deleteTarget.stokGudang ?? 0)
      const sisaDisplay = Number(deleteTarget.stokDisplay ?? 0)

      setRiwayat((prev) =>
        tambahRiwayat(
          prev,
          buatEntriRiwayat({
            jenis: 'barang',
            sku: deleteTarget.sku,
            nama: deleteTarget.nama,
            keterangan:
              'Barang dihapus dari Kelola Data Barang.' +
              (sisaGudang + sisaDisplay > 0
                ? ` Sisa stok saat dihapus: Gudang ${sisaGudang}, Display ${sisaDisplay}.`
                : ''),
          })
        )
      )
    }

    setDeleteTarget(null)
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
            Kelola data barang dan kategori barang.
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
            Cari nama barang atau SKU
          </label>

          <input
            id="search-barang"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama barang atau SKU..."
            className={`w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm ${focusClass}`}
          />
        </div>

        <div className="sm:w-52">
          <label htmlFor="kategoriFilter" className="sr-only">
            Filter kategori barang
          </label>
          <select
            id="kategoriFilter"
            value={filterAktif}
            onChange={(e) => setKategoriFilter(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white ${focusClass}`}
          >
            <option value="">Semua Kategori</option>
            {kategoriTersedia.map((kategori) => (
              <option key={kategori} value={kategori}>
                {kategori}
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
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 min-[1300px]:grid-cols-6 gap-4">
            {filteredItems.map((item, index) => (
              <li
                key={item.id}
                className="flex flex-col gap-2.5 rounded-xl bg-[#EDEAFF] border border-[#C2B6FE]/60 p-3 shadow-sm"
              >
                {/* NO + SKU */}
                <div className="flex items-center gap-2">
                  <span
                    className="shrink-0 w-6 h-6 rounded-full bg-white text-[11px] font-semibold text-[#5B528D] flex items-center justify-center"
                    title="Nomor urut"
                  >
                    {index + 1}
                  </span>
                  <p className="text-xs font-semibold text-slate-600 truncate">
                    {item.sku}
                  </p>
                </div>

                {/* NAMA BARANG */}
                <p
                  className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 min-h-[2.5rem]"
                  title={item.nama}
                >
                  {item.nama}
                </p>

                {/* FOTO BARANG */}
                {item.gambar ? (
                  <img
                    src={item.gambar}
                    alt={item.nama}
                    className="w-full aspect-square rounded-lg object-cover border border-white bg-white"
                  />
                ) : (
                  <div className="w-full aspect-square rounded-lg bg-white/70 text-slate-300 flex items-center justify-center">
                    <ImagePlus size={28} />
                  </div>
                )}

                {/* KATEGORI BARANG */}
                <p className="text-xs text-slate-600 truncate">
                  <span className="text-slate-400">Kategori: </span>
                  <span className="font-medium">{item.kategori || '-'}</span>
                </p>

                {/* AKSI */}
                <div className="flex items-center justify-end gap-1 pt-1 border-t border-[#C2B6FE]/50">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-[#5B528D] hover:bg-white transition-colors"
                    aria-label={`Edit ${item.nama}`}
                    title="Edit Barang"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => openDeleteModal(item)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-white transition-colors"
                    aria-label={`Hapus ${item.nama}`}
                    title="Hapus Barang"
                  >
                    <Trash2 size={16} />
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
            placeholder="Ketik nama barang"
          />

          {/* KATEGORI: diketik sendiri, saran hanya dari kategori yang sudah pernah dipakai */}
          <div>
            <label
              htmlFor="kategori"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Kategori Barang
            </label>
            <input
              id="kategori"
              name="kategori"
              type="text"
              list="daftar-kategori"
              autoComplete="off"
              value={formData.kategori}
              onChange={handleFormChange}
              placeholder="Ketik nama kategori barang"
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                formErrors.kategori
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-slate-300 focus:ring-[#8A7CD9] focus:border-[#8A7CD9]'
              }`}
            />
            <datalist id="daftar-kategori">
              {kategoriTersedia.map((kategori) => (
                <option key={kategori} value={kategori} />
              ))}
            </datalist>
            {formErrors.kategori && (
              <p className="mt-1 text-sm text-red-600">{formErrors.kategori}</p>
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
                    JPG, JPEG, atau PNG maksimal 2 MB
                  </p>
                </div>
              )}

              <input
                id="gambar-barang"
                name="gambar"
                type="file"
                accept="image/png,image/jpeg,image/jpg"
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
