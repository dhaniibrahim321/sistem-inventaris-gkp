import { useState } from 'react'
import { Search, ArrowRight, CheckCircle2, ArrowLeftRight } from 'lucide-react'
import { Button, Input, Textarea, Card, Badge } from '../components/common'
import { transferGudangKeDisplay } from '../services/barangService'
import { buatEntriRiwayat, tambahRiwayat } from '../services/riwayatService'
import { todayISOString } from '../utils/dateHelpers'

export default function PergerakanPage({ barang, setBarang, setRiwayat }) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const [tanggal, setTanggal] = useState(todayISOString())
  const [jumlah, setJumlah] = useState('')
  const [catatan, setCatatan] = useState('')
  const [errors, setErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')

  const selectedItem = barang.find((item) => item.id === selectedId) || null

  const filteredItems = barang.filter((item) => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return true
    return (
      item.nama.toLowerCase().includes(keyword) ||
      item.sku.toLowerCase().includes(keyword)
    )
  })

  function handleSelectItem(item) {
    setSelectedId(item.id)
    setSuccessMessage('')
    setErrors({})
    setJumlah('')
  }

  function validate() {
    const errs = {}
    if (!selectedItem) {
      errs.produk = 'Pilih produk terlebih dahulu.'
    } else {
      if (!jumlah || Number(jumlah) <= 0) {
        errs.jumlah = 'Jumlah harus lebih dari 0.'
      } else if (Number(jumlah) > selectedItem.stokGudang) {
        errs.jumlah = `Jumlah melebihi stok gudang yang tersedia (${selectedItem.stokGudang} ${selectedItem.satuan}).`
      }
    }
    if (!tanggal) errs.tanggal = 'Tanggal wajib diisi.'
    return errs
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setBarang((prev) => transferGudangKeDisplay(prev, selectedId, Number(jumlah)))
    setRiwayat((prev) =>
      tambahRiwayat(
        prev,
        buatEntriRiwayat({
          jenis: 'pergerakan',
          sku: selectedItem.sku,
          nama: selectedItem.nama,
          keterangan: `Transfer gudang ke display, +${jumlah} ${selectedItem.satuan}${catatan ? ` (${catatan})` : ''}`,
        })
      )
    )

    setSuccessMessage(
      `${jumlah} ${selectedItem.satuan} "${selectedItem.nama}" berhasil dipindahkan dari gudang ke display.`
    )
    setJumlah('')
    setCatatan('')
    setErrors({})
  }

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <header>
        <h1 className="text-xl font-semibold text-slate-800">Pergerakan Barang</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Transfer stok dari gudang ke area display toko.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Panel Kiri: Pencarian & Rincian Produk */}
        <section aria-label="Pilih produk">
          <Card title="Pilih Produk">
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <label htmlFor="search-pergerakan" className="sr-only">Cari nama barang atau SKU</label>
              <input
                id="search-pergerakan"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama barang atau SKU..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
              {barang.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-400 text-center">
                  Belum ada data barang. Tambahkan barang lewat halaman Kelola Data Barang terlebih dahulu.
                </p>
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
                      selectedId === item.id
                        ? 'bg-rose-50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.nama}</p>
                      <p className="text-xs text-slate-500">{item.sku}</p>
                    </div>
                    <p className="text-xs text-slate-500 whitespace-nowrap">
                      Gudang: {item.stokGudang} {item.satuan}
                    </p>
                  </button>
                ))
              ) : (
                <p className="px-4 py-6 text-sm text-slate-400 text-center">
                  Produk tidak ditemukan.
                </p>
              )}
            </div>

            {/* Rincian Produk Terpilih */}
            {selectedItem ? (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">{selectedItem.nama}</p>
                  <Badge variant="default">{selectedItem.kategori}</Badge>
                </div>
                <p className="text-xs text-slate-500">SKU: {selectedItem.sku}</p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <p className="text-xs text-slate-500">Stok Gudang saat ini</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {selectedItem.stokGudang} <span className="text-xs font-normal text-slate-400">{selectedItem.satuan}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Stok Display saat ini</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {selectedItem.stokDisplay} <span className="text-xs font-normal text-slate-400">{selectedItem.satuan}</span>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400 text-center py-4">
                Pilih salah satu produk di atas untuk melihat rinciannya.
              </p>
            )}
          </Card>
        </section>

        {/* Panel Kanan: Form Transaksi */}
        <section aria-label="Form transfer stok">
          <Card title="Form Transfer Stok">
            {successMessage && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                <p>{successMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.produk && (
                <p className="text-sm text-red-600">{errors.produk}</p>
              )}

              <Input
                label="Tanggal"
                name="tanggal"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                error={errors.tanggal}
              />

              <Input
                label="Jumlah Transfer"
                name="jumlah"
                type="number"
                min="1"
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                error={errors.jumlah}
                placeholder="0"
                disabled={!selectedItem}
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Lokasi / Tujuan
                </label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-600">
                  <span className="font-medium">Gudang</span>
                  <ArrowRight size={14} className="text-slate-400" />
                  <span className="font-medium">Display</span>
                </div>
              </div>

              <Textarea
                label="Catatan Tambahan (opsional)"
                name="catatan"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: alasan transfer, kondisi barang, dll."
                disabled={!selectedItem}
              />

              <div className="pt-2">
                <Button type="submit" disabled={!selectedItem} className="w-full">
                  <ArrowLeftRight size={16} className="mr-1.5" />
                  Simpan Pergerakan
                </Button>
              </div>
            </form>
          </Card>
        </section>
      </div>
    </div>
  )
}
