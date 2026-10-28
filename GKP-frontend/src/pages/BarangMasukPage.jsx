import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Search,
  Package,
  Warehouse,
  Store,
  ArrowRight,
  CalendarDays,
  MapPin,
  FileText,
  CheckCircle2,
  Layers,
} from 'lucide-react'

import {
  buatEntriRiwayat,
  tambahRiwayat,
} from '../services/riwayatService'
import { tambahKloterBarang } from '../services/barangService'
import {
  getStokView,
  nomorKloterBerikutnya,
} from '../utils/kloterHelpers'
import { todayISOString } from '../utils/dateHelpers'

const inputClass =
  'w-full rounded-lg border bg-white py-2.5 text-sm outline-none transition ' +
  'focus:border-[#8A7CD9] focus:ring-2 focus:ring-[#8A7CD9]/20 ' +
  'disabled:bg-gray-50 disabled:cursor-not-allowed'

function FieldError({ children }) {
  if (!children) return null
  return <p className="mt-1 text-sm text-red-600">{children}</p>
}

export default function BarangMasukPage({
  barang = [],
  setBarang,
  setRiwayat,
}) {
  /* =========================================
     PILIH BARANG
     Dashboard (Stok Kritis Gudang) membawa { barangId } lewat navigasi,
     sehingga barang yang diklik langsung terpilih di halaman ini.
  ========================================== */

  const location = useLocation()
  const barangIdAwal = location.state?.barangId ?? null
  const barangAwal =
    barang.find((item) => item.id === barangIdAwal) || null

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(
    barangAwal ? barangAwal.id : null
  )

  // Selalu diambil dari data terbaru, bukan salinan lama.
  const selectedItem =
    barang.find((item) => item.id === selectedId) || null

  /* =========================================
     FORM TRANSAKSI BARANG MASUK
  ========================================== */

  const [jumlah, setJumlah] = useState('')
  const [lokasiRak, setLokasiRak] = useState('')
  const [tanggalKadaluarsa, setTanggalKadaluarsa] = useState('')
  const [tanggalMasuk, setTanggalMasuk] = useState(todayISOString())
  const [catatan, setCatatan] = useState('')

  const [errors, setErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')

  const kloterBerikutnya = selectedItem
    ? nomorKloterBerikutnya(selectedItem)
    : 1

  // Angka stok seluruh kloter barang yang dipilih.
  const stokView = selectedItem
    ? getStokView(selectedItem, 'all')
    : { gudang: 0, display: 0, total: 0 }

  const satuan = selectedItem?.satuan || 'pcs'

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    if (!keyword) return barang

    return barang.filter(
      (item) =>
        String(item.nama ?? '').toLowerCase().includes(keyword) ||
        String(item.sku ?? '').toLowerCase().includes(keyword)
    )
  }, [barang, search])

  // Gulir daftar ke barang yang terpilih (mis. saat datang dari Dashboard).
  useEffect(() => {
    if (selectedId === null) return
    document
      .getElementById(`pilih-barang-${selectedId}`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  function resetForm() {
    setJumlah('')
    setLokasiRak('')
    setTanggalKadaluarsa('')
    setTanggalMasuk(todayISOString())
    setCatatan('')
    setErrors({})
  }

  function handleSelectItem(item) {
    setSelectedId(item.id)
    setSuccessMessage('')
    resetForm()
  }

  /* =========================================
     VALIDASI
  ========================================== */

  function validate() {
    const errs = {}

    if (!selectedItem) {
      errs.barang = 'Pilih barang terlebih dahulu.'
    }

    if (!jumlah || Number(jumlah) <= 0) {
      errs.jumlah = 'Jumlah barang harus lebih dari 0.'
    }

    if (!lokasiRak.trim()) {
      errs.lokasiRak = 'Lokasi rak gudang wajib diisi.'
    }

    if (!tanggalKadaluarsa) {
      errs.tanggalKadaluarsa = 'Tanggal kedaluwarsa wajib dipilih.'
    }

    if (!tanggalMasuk) {
      errs.tanggalMasuk = 'Tanggal masuk wajib diisi.'
    }

    if (
      tanggalKadaluarsa &&
      tanggalMasuk &&
      tanggalKadaluarsa < tanggalMasuk
    ) {
      errs.tanggalKadaluarsa =
        'Tanggal kedaluwarsa tidak boleh lebih awal dari tanggal masuk.'
    }

    return errs
  }

  /* =========================================
     SUBMIT
  ========================================== */

  function handleSubmit(e) {
    e.preventDefault()

    const errs = validate()

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setSuccessMessage('')
      return
    }

    const jumlahMasuk = Number(jumlah)

    // Kloter baru: seluruh barang masuk berada di gudang (stokDisplay 0).
    // jumlahAwal = TOTAL kloter dan tidak berubah oleh pergerakan/pengurangan.
    const kloterBaru = {
      id: Date.now(),
      nomor: kloterBerikutnya,
      jumlah: jumlahMasuk,
      jumlahAwal: jumlahMasuk,
      stokGudang: jumlahMasuk,
      stokDisplay: 0,
      tanggalMasuk,
      tanggalKadaluarsa,
      lokasiRak,
      catatan,
    }

    setBarang((prev) => tambahKloterBarang(prev, selectedItem.id, kloterBaru))

    const catatanTrim = catatan.trim()

    // Keterangan diawali jumlah (+N) karena Dashboard membaca angka pada
    // riwayat untuk grafik barang masuk gudang.
    setRiwayat((prev) =>
      tambahRiwayat(
        prev,
        buatEntriRiwayat({
          jenis: 'masuk',
          sku: selectedItem.sku,
          nama: selectedItem.nama,
          tanggalTransaksi: tanggalMasuk,
          jumlah: jumlahMasuk,
          kloter: kloterBerikutnya,
          keterangan:
            `Barang masuk +${jumlahMasuk} ${satuan} (Kloter ${kloterBerikutnya}). ` +
            `Lokasi rak: ${lokasiRak.trim()}. ` +
            `Tanggal masuk: ${tanggalMasuk}. ` +
            `Tanggal kedaluwarsa: ${tanggalKadaluarsa}. ` +
            `Stok gudang ${stokView.gudang} → ${stokView.gudang + jumlahMasuk}.` +
            (catatanTrim ? ` Catatan: ${catatanTrim}` : ''),
        })
      )
    )

    setSuccessMessage(
      `${jumlahMasuk} ${satuan} "${selectedItem.nama}" (Kloter ${kloterBerikutnya}) berhasil ditambahkan ke stok gudang.`
    )

    resetForm()
  }

  /* =========================================
     RENDER
  ========================================== */

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Pencatatan Barang
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Catat barang yang masuk ke gudang dan tentukan lokasi
          penyimpanannya.
        </p>
      </div>


      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* ===================================
            PILIH BARANG
        ==================================== */}
        <section
          aria-label="Pilih barang"
          className="rounded-xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Pilih Barang
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Pilih barang yang masuk ke gudang.
            </p>
          </div>

          <div className="p-5">
            <div className="relative">
              <Search
                size={19}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <label htmlFor="search-barang-masuk" className="sr-only">
                Cari nama barang atau SKU
              </label>

              <input
                id="search-barang-masuk"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama barang atau SKU..."
                className={`${inputClass} border-gray-300 pl-10 pr-4`}
              />
            </div>

            <div className="mt-4 max-h-[500px] space-y-3 overflow-y-auto">
              {barang.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                  <Package size={40} className="mx-auto text-gray-300" />

                  <p className="mt-3 text-sm text-gray-500">
                    Belum ada data barang. Tambahkan barang terlebih dahulu
                    melalui halaman Kelola Data Barang.
                  </p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                  <Package size={40} className="mx-auto text-gray-300" />

                  <p className="mt-3 text-sm text-gray-500">
                    Barang tidak ditemukan.
                  </p>
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedId === item.id

                  return (
                    <button
                      key={item.id}
                      id={`pilih-barang-${item.id}`}
                      type="button"
                      onClick={() => handleSelectItem(item)}
                      className={`w-full rounded-lg border p-4 text-left transition ${
                        isSelected
                          ? 'border-[#8A7CD9] bg-[#EDEAFF]'
                          : 'border-gray-200 bg-white hover:border-[#C2B6FE] hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                          {item.gambar ? (
                            <img
                              src={item.gambar}
                              alt={item.nama}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package size={25} className="text-gray-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-gray-800">
                            {item.nama || 'Tanpa nama'}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            SKU: {item.sku || '-'}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {item.kategori || 'Tanpa kategori'}
                          </p>
                        </div>

                        {isSelected && (
                          <CheckCircle2
                            size={22}
                            className="shrink-0 text-[#5B528D]"
                          />
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </section>

        {/* ===================================
            TRANSAKSI BARANG MASUK
        ==================================== */}
        <section
          aria-label="Transaksi barang masuk"
          className="space-y-6"
        >
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Transaksi Barang Masuk
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Informasi stok barang yang dipilih.
              </p>
            </div>

            <div className="p-5">
              {!selectedItem ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                  <Package size={45} className="mx-auto text-gray-300" />

                  <p className="mt-3 font-medium text-gray-600">
                    Belum ada barang yang dipilih
                  </p>

                  <p className="mt-1 text-sm text-gray-400">
                    Pilih barang dari daftar di sebelah kiri.
                  </p>

                  {errors.barang && (
                    <p className="mt-3 text-sm text-red-600">
                      {errors.barang}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 rounded-lg bg-gray-50 p-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-white">
                      {selectedItem.gambar ? (
                        <img
                          src={selectedItem.gambar}
                          alt={selectedItem.nama}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package size={28} className="text-gray-400" />
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {selectedItem.nama || '-'}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        SKU: {selectedItem.sku || '-'}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {selectedItem.kategori || 'Tanpa kategori'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Warehouse size={17} />
                        Gudang
                      </div>

                      <p className="mt-2 text-2xl font-bold text-gray-800">
                        {stokView.gudang}
                      </p>

                      <p className="text-xs text-gray-400">Stok tersedia</p>
                    </div>

                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Store size={17} />
                        Display
                      </div>

                      <p className="mt-2 text-2xl font-bold text-gray-800">
                        {stokView.display}
                      </p>

                      <p className="text-xs text-gray-400">Stok tersedia</p>
                    </div>

                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Package size={17} />
                        Total
                      </div>

                      <p className="mt-2 text-2xl font-bold text-gray-800">
                        {stokView.total}
                      </p>

                      <p className="text-xs text-gray-400">Seluruh stok</p>
                    </div>
                  </div>

                  <div className="my-5 flex items-center justify-center gap-3 text-sm font-medium text-gray-500">
                    <span className="rounded-lg bg-gray-100 px-4 py-2">
                      Barang Masuk
                    </span>

                    <ArrowRight size={22} className="text-[#5B528D]" />

                    <span className="rounded-lg bg-[#EDEAFF] px-4 py-2 text-[#5B528D]">
                      Gudang
                    </span>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* KLOTER (otomatis) */}
                    <div className="flex items-start gap-3 rounded-lg border border-[#C2B6FE] bg-[#EDEAFF]/60 px-4 py-3">
                      <Layers
                        size={18}
                        className="mt-0.5 shrink-0 text-[#5B528D]"
                      />
                      <div>
                        <p className="text-sm font-semibold text-[#5B528D]">
                          Kloter {kloterBerikutnya}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          Setiap pencatatan barang masuk akan membuat kloter
                          baru.
                        </p>
                      </div>
                    </div>

                    {/* JUMLAH */}
                    <div>
                      <label
                        htmlFor="jumlah-masuk"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Jumlah Barang ke Gudang
                      </label>

                      <input
                        id="jumlah-masuk"
                        type="number"
                        min="1"
                        value={jumlah}
                        onChange={(e) => setJumlah(e.target.value)}
                        placeholder="Masukkan jumlah barang"
                        className={`${inputClass} px-4 ${
                          errors.jumlah ? 'border-red-400' : 'border-gray-300'
                        }`}
                      />
                      <FieldError>{errors.jumlah}</FieldError>
                    </div>

                    {/* LOKASI RAK */}
                    <div>
                      <label
                        htmlFor="lokasi-rak"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Lokasi Rak Gudang
                      </label>

                      <div className="relative">
                        <MapPin
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                          id="lokasi-rak"
                          type="text"
                          value={lokasiRak}
                          onChange={(e) => setLokasiRak(e.target.value)}
                          placeholder="Contoh: Rak A-01"
                          className={`${inputClass} pl-10 pr-4 ${
                            errors.lokasiRak
                              ? 'border-red-400'
                              : 'border-gray-300'
                          }`}
                        />
                      </div>
                      <FieldError>{errors.lokasiRak}</FieldError>
                    </div>

                    {/* TANGGAL KEDALUWARSA */}
                    <div>
                      <label
                        htmlFor="tanggal-kedaluwarsa"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Tanggal Kedaluwarsa
                      </label>

                      <div className="relative">
                        <CalendarDays
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                          id="tanggal-kedaluwarsa"
                          type="date"
                          value={tanggalKadaluarsa}
                          onChange={(e) =>
                            setTanggalKadaluarsa(e.target.value)
                          }
                          className={`${inputClass} pl-10 pr-4 ${
                            errors.tanggalKadaluarsa
                              ? 'border-red-400'
                              : 'border-gray-300'
                          }`}
                        />
                      </div>
                      <FieldError>{errors.tanggalKadaluarsa}</FieldError>
                    </div>

                    {/* TANGGAL MASUK */}
                    <div>
                      <label
                        htmlFor="tanggal-masuk"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Tanggal Masuk Barang
                      </label>

                      <div className="relative">
                        <CalendarDays
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                          id="tanggal-masuk"
                          type="date"
                          value={tanggalMasuk}
                          onChange={(e) => setTanggalMasuk(e.target.value)}
                          className={`${inputClass} pl-10 pr-4 ${
                            errors.tanggalMasuk
                              ? 'border-red-400'
                              : 'border-gray-300'
                          }`}
                        />
                      </div>
                      <FieldError>{errors.tanggalMasuk}</FieldError>
                    </div>

                    {/* CATATAN */}
                    <div>
                      <label
                        htmlFor="catatan-masuk"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Catatan
                      </label>

                      <div className="relative">
                        <FileText
                          size={18}
                          className="absolute left-3 top-3 text-gray-400"
                        />

                        <textarea
                          id="catatan-masuk"
                          rows="3"
                          value={catatan}
                          onChange={(e) => setCatatan(e.target.value)}
                          placeholder="Contoh: Nama supplier, nomor faktur, kondisi barang, atau catatan lainnya."
                          className={`${inputClass} resize-none border-gray-300 pl-10 pr-4`}
                        />
                      </div>
                    </div>

                    {successMessage && (
                      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        <CheckCircle2 size={20} className="shrink-0" />
                        <span>{successMessage}</span>
                      </div>
                    )}
                    
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-[#5B528D] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4a4275] focus:outline-none focus:ring-2 focus:ring-[#C2B6FE]"
                    >
                      Simpan Pencatatan Barang
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}