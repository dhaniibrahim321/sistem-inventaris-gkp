import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Search,
  Package,
  Warehouse,
  Store,
  ArrowRight,
  CalendarDays,
  FileText,
  CheckCircle2,
  Layers,
  Loader2,
  Pencil,
  AlertTriangle,
} from 'lucide-react'

import { Button, Modal } from '../components/common'
import {
  buatEntriRiwayat,
  tambahRiwayat,
} from '../services/riwayatService'
import {
  tambahKloterBarang,
  setStokKloter,
} from '../services/barangService'
import {
  getStokView,
  nomorKloterBerikutnya,
} from '../utils/kloterHelpers'
import { todayISOString, formatTanggal } from '../utils/dateHelpers'
import { simpanBarangMasuk } from '../services/barangMasukService'
import * as stokService from '../services/stokService'

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
  const [dbBarang, setDbBarang] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function muatDataBarang() {
    setLoading(true)
    try {
      const res = await stokService.getDaftarStok({ limit: 1000 })
      if (res?.data && Array.isArray(res.data)) {
        const mapped = res.data.map((b) => ({
          id: b.id_barang,
          sku: b.sku,
          nama: b.nama_barang,
          varian: b.varian || '',
          brand: b.brand || '',
          satuan: b.satuan || 'pcs',
          gambar: b.foto_url || null,
          stokGudang: Number(b.stok_gudang || 0),
          stokDisplay: Number(b.stok_display || 0),
          totalStok: Number(b.total || b.total_stok || 0),
          kloter: (b.kloter || []).map((k) => ({
            id: k.id_kloter,
            nomor: String(k.nama_kloter || '').replace(/[^0-9]/g, '') || k.nama_kloter || 1,
            namaKloter: k.nama_kloter,
            tanggalKadaluarsa: k.tanggal_kedaluwarsa,
            stokGudang: Number(k.stok_gudang || 0),
            stokDisplay: Number(k.stok_display || 0),
            jumlahAwal: Number(k.jumlah_awal || (k.stok_gudang + k.stok_display) || 0),
            sisaHari: k.sisa_hari,
          })),
        }))
        setDbBarang(mapped)
      }
    } catch (err) {
      console.warn('Gagal memuat barang dari backend:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    muatDataBarang()
  }, [])

  const barangAktif = dbBarang ?? barang

  const location = useLocation()
  const barangIdAwal = location.state?.barangId ?? null
  const barangAwal =
    barangAktif.find((item) => item.id === barangIdAwal) || null

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(
    barangAwal ? barangAwal.id : null
  )

  useEffect(() => {
    if (barangIdAwal && !selectedId && barangAktif.length > 0) {
      const match = barangAktif.find((item) => item.id === barangIdAwal)
      if (match) setSelectedId(match.id)
    }
  }, [barangIdAwal, barangAktif, selectedId])

  const selectedItem =
    barangAktif.find((item) => item.id === selectedId) || null

  const [jumlah, setJumlah] = useState('')
  const [tanggalKadaluarsa, setTanggalKadaluarsa] = useState('')
  const [tanggalMasuk, setTanggalMasuk] = useState(todayISOString())
  const [catatan, setCatatan] = useState('')

  // Opsi Kloter Masuk: 'baru' atau 'ada' (tambah ke kloter yang sudah ada)
  const [modeKloter, setModeKloter] = useState('baru')
  const [idKloterTerpilih, setIdKloterTerpilih] = useState('')

  // Modal Koreksi / Edit Jumlah Kloter
  const [modalKoreksiOpen, setModalKoreksiOpen] = useState(false)
  const [koreksiSearch, setKoreksiSearch] = useState('')
  const [koreksiBarangId, setKoreksiBarangId] = useState('')
  const [koreksiKloterId, setKoreksiKloterId] = useState('')
  const [koreksiStokGudang, setKoreksiStokGudang] = useState('')
  const [koreksiStokDisplay, setKoreksiStokDisplay] = useState('')
  const [koreksiCatatan, setKoreksiCatatan] = useState('')
  const [koreksiSubmitting, setKoreksiSubmitting] = useState(false)
  const [koreksiError, setKoreksiError] = useState('')
  const [koreksiSuccess, setKoreksiSuccess] = useState('')

  const [errors, setErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')

  const kloterBerikutnya = selectedItem
    ? nomorKloterBerikutnya(selectedItem)
    : 1

  const stokView = selectedItem
    ? getStokView(selectedItem, 'all')
    : { gudang: 0, display: 0, total: 0 }

  const satuan = selectedItem?.satuan || 'pcs'

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    if (!keyword) return barangAktif

    return barangAktif.filter(
      (item) =>
        String(item.nama ?? '').toLowerCase().includes(keyword) ||
        String(item.varian ?? '').toLowerCase().includes(keyword) ||
        String(item.brand ?? '').toLowerCase().includes(keyword) ||
        String(item.sku ?? '').toLowerCase().includes(keyword)
    )
  }, [barangAktif, search])

  const koreksiBarangFiltered = useMemo(() => {
    const keyword = koreksiSearch.trim().toLowerCase()
    if (!keyword) return barangAktif
    return barangAktif.filter(
      (item) =>
        String(item.sku ?? '').toLowerCase().includes(keyword) ||
        String(item.nama ?? '').toLowerCase().includes(keyword) ||
        String(item.varian ?? '').toLowerCase().includes(keyword) ||
        String(item.brand ?? '').toLowerCase().includes(keyword)
    )
  }, [barangAktif, koreksiSearch])

  useEffect(() => {
    if (selectedId === null) return
    document
      .getElementById(`pilih-barang-${selectedId}`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  function resetForm() {
    setJumlah('')
    setTanggalKadaluarsa('')
    setTanggalMasuk(todayISOString())
    setCatatan('')
    setModeKloter('baru')
    setIdKloterTerpilih('')
    setErrors({})
  }

  function handleSelectItem(item) {
    setSelectedId(item.id)
    setSuccessMessage('')
    resetForm()
  }

  function validate() {
    const errs = {}

    if (!selectedItem) {
      errs.barang = 'Pilih barang terlebih dahulu.'
    }

    if (!jumlah || Number(jumlah) <= 0) {
      errs.jumlah = 'Jumlah barang harus lebih dari 0.'
    }

    if (modeKloter === 'ada' && !idKloterTerpilih) {
      errs.kloter = 'Pilih kloter yang ingin ditambahkan stoknya.'
    }

    if (modeKloter === 'baru' && !tanggalKadaluarsa) {
      errs.tanggalKadaluarsa = 'Tanggal kedaluwarsa wajib dipilih.'
    }

    if (!tanggalMasuk) {
      errs.tanggalMasuk = 'Tanggal masuk wajib diisi.'
    }

    if (
      modeKloter === 'baru' &&
      tanggalKadaluarsa &&
      tanggalMasuk &&
      tanggalKadaluarsa < tanggalMasuk
    ) {
      errs.tanggalKadaluarsa =
        'Tanggal kedaluwarsa tidak boleh lebih awal dari tanggal masuk.'
    }

    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const errs = validate()

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setSuccessMessage('')
      return
    }

    const jumlahMasuk = Number(jumlah)
    setSubmitting(true)
    setErrors({})
    setSuccessMessage('')

    const isKloterAda = modeKloter === 'ada' && Boolean(idKloterTerpilih)
    const kloterAdaObj = isKloterAda
      ? (selectedItem.kloter || []).find(
          (k) => String(k.id) === String(idKloterTerpilih)
        )
      : null

    const expDate = isKloterAda && kloterAdaObj?.tanggalKadaluarsa
      ? kloterAdaObj.tanggalKadaluarsa
      : tanggalKadaluarsa

    try {
      const payload = {
        id_barang: selectedItem.id,
        jumlah: jumlahMasuk,
        tanggal_masuk: tanggalMasuk,
        tanggal_kedaluwarsa: expDate,
        ...(isKloterAda ? { id_kloter: Number(idKloterTerpilih) } : {}),
        catatan: catatan.trim() || undefined,
      }
      const res = await simpanBarangMasuk(payload)

      const kloterNomor = isKloterAda
        ? kloterAdaObj?.nomor || idKloterTerpilih
        : res?.data?.nama_kloter
        ? String(res.data.nama_kloter).replace(/[^0-9]/g, '') || kloterBerikutnya
        : kloterBerikutnya

      if (typeof setBarang === 'function') {
        if (!isKloterAda) {
          const kloterBaru = {
            id: res?.data?.id_kloter || Date.now(),
            nomor: kloterNomor,
            jumlah: jumlahMasuk,
            jumlahAwal: jumlahMasuk,
            stokGudang: jumlahMasuk,
            stokDisplay: 0,
            tanggalMasuk,
            tanggalKadaluarsa: expDate,
            catatan,
          }
          setBarang((prev) =>
            tambahKloterBarang(prev, selectedItem.id, kloterBaru)
          )
        }
      }

      const catatanTrim = catatan.trim()
      if (typeof setRiwayat === 'function') {
        const namaLog = selectedItem.varian
          ? `${selectedItem.nama} (${selectedItem.varian})`
          : selectedItem.nama
        setRiwayat((prev) =>
          tambahRiwayat(
            prev,
            buatEntriRiwayat({
              jenis: 'masuk',
              sku: selectedItem.sku,
              nama: namaLog,
              tanggalTransaksi: tanggalMasuk,
              jumlah: jumlahMasuk,
              kloter: kloterNomor,
              keterangan:
                `Barang masuk +${jumlahMasuk} ${satuan} (${
                  isKloterAda ? `Penambahan ke Kloter ${kloterNomor}` : `Kloter ${kloterNomor}`
                }). ` +
                `Tanggal masuk: ${tanggalMasuk}. ` +
                `Tanggal kedaluwarsa: ${expDate}. ` +
                `Stok gudang ${stokView.gudang} → ${
                  stokView.gudang + jumlahMasuk
                }.` +
                (catatanTrim ? ` Catatan: ${catatanTrim}` : ''),
            })
          )
        )
      }

      setSuccessMessage(
        `${jumlahMasuk} ${satuan} "${selectedItem.nama}" (${
          isKloterAda ? `Penambahan ke Kloter ${kloterNomor}` : `Kloter Baru ${kloterNomor}`
        }) berhasil ditambahkan ke stok gudang.`
      )

      resetForm()
      await muatDataBarang()
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Gagal menyimpan pencatatan barang masuk.'
      setErrors({ submit: msg })
    } finally {
      setSubmitting(false)
    }
  }

  // Helper untuk modal koreksi
  const koreksiBarang =
    barangAktif.find((b) => String(b.id) === String(koreksiBarangId)) || null
  const koreksiKloter =
    koreksiBarang?.kloter?.find(
      (k) => String(k.id) === String(koreksiKloterId)
    ) || null

  function pilihBarangUntukKoreksi(b) {
    if (!b) {
      setKoreksiBarangId('')
      setKoreksiKloterId('')
      setKoreksiStokGudang('')
      setKoreksiStokDisplay('')
      return
    }
    setKoreksiBarangId(String(b.id))
    if (b.kloter?.length > 0) {
      const firstK = b.kloter[0]
      setKoreksiKloterId(String(firstK.id))
      setKoreksiStokGudang(String(firstK.stokGudang))
      setKoreksiStokDisplay(String(firstK.stokDisplay))
    } else {
      setKoreksiKloterId('')
      setKoreksiStokGudang('')
      setKoreksiStokDisplay('')
    }
  }

  function handleKoreksiSearchChange(value) {
    setKoreksiSearch(value)
    const keyword = value.trim().toLowerCase()
    const matched = !keyword
      ? barangAktif
      : barangAktif.filter(
          (item) =>
            String(item.sku ?? '').toLowerCase().includes(keyword) ||
            String(item.nama ?? '').toLowerCase().includes(keyword) ||
            String(item.varian ?? '').toLowerCase().includes(keyword) ||
            String(item.brand ?? '').toLowerCase().includes(keyword)
        )
    const masihAda = matched.some((item) => String(item.id) === String(koreksiBarangId))
    if (!masihAda) {
      pilihBarangUntukKoreksi(matched[0] || null)
    }
  }

  async function handleSimpanKoreksi(e) {
    e.preventDefault()
    if (!koreksiKloterId || !koreksiKloter) {
      setKoreksiError('Pilih kloter yang ingin disesuaikan.')
      return
    }

    const g = Number(koreksiStokGudang)
    const d = Number(koreksiStokDisplay)
    if (
      koreksiStokGudang === '' ||
      koreksiStokDisplay === '' ||
      !Number.isInteger(g) ||
      !Number.isInteger(d) ||
      g < 0 ||
      d < 0
    ) {
      setKoreksiError(
        'Jumlah stok gudang dan display harus berupa bilangan bulat 0 atau lebih.'
      )
      return
    }

    if (koreksiKloter.jumlahAwal && g + d > koreksiKloter.jumlahAwal) {
      setKoreksiError(
        `Gudang + display (${g + d}) tidak boleh melebihi jumlah masuk awal Kloter ${koreksiKloter.nomor} (${koreksiKloter.jumlahAwal}).`
      )
      return
    }

    const gudangLama = koreksiKloter.stokGudang
    const displayLama = koreksiKloter.stokDisplay
    const nomorKloter = koreksiKloter.nomor
    const catatanTrim = koreksiCatatan.trim()

    setKoreksiSubmitting(true)
    setKoreksiError('')
    try {
      await stokService.sesuaikanStokKloter(koreksiKloterId, {
        stok_gudang: g,
        stok_display: d,
        catatan: catatanTrim || undefined,
      })

      if (typeof setBarang === 'function') {
        setBarang((prev) =>
          setStokKloter(prev, Number(koreksiBarangId), koreksiKloterId, {
            stokGudang: g,
            stokDisplay: d,
          })
        )
      }

      if (
        typeof setRiwayat === 'function' &&
        koreksiBarang &&
        (g !== gudangLama || d !== displayLama)
      ) {
        const namaLog = koreksiBarang.varian
          ? `${koreksiBarang.nama} (${koreksiBarang.varian})`
          : koreksiBarang.nama
        setRiwayat((prev) =>
          tambahRiwayat(
            prev,
            buatEntriRiwayat({
              jenis: 'stok',
              sku: koreksiBarang.sku,
              nama: namaLog,
              kloter: nomorKloter,
              keterangan:
                `Koreksi / penyesuaian stok Kloter ${nomorKloter}: ` +
                `Gudang ${gudangLama} → ${g}, Display ${displayLama} → ${d}.` +
                (catatanTrim ? ` Catatan: ${catatanTrim}` : ''),
            })
          )
        )
      }

      setKoreksiSuccess('Jumlah stok kloter berhasil disesuaikan!')
      await muatDataBarang()
      setTimeout(() => {
        setModalKoreksiOpen(false)
        setKoreksiSuccess('')
      }, 900)
    } catch (err) {
      setKoreksiError(
        err.response?.data?.message ||
          err.message ||
          'Gagal menyesuaikan stok kloter.'
      )
    } finally {
      setKoreksiSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Pencatatan Barang
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Catat barang yang masuk ke gudang per kloter.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setModalKoreksiOpen(true)
            setKoreksiSearch('')
            setKoreksiCatatan('')
            setKoreksiError('')
            setKoreksiSuccess('')
            if (selectedItem) {
              pilihBarangUntukKoreksi(selectedItem)
            } else if (barangAktif.length > 0) {
              pilihBarangUntukKoreksi(barangAktif[0])
            }
          }}
          className="border-[#8A7CD9] text-[#5B528D] hover:bg-[#8A7CD9]/10"
        >
          <Pencil size={15} className="mr-1.5" />
          Koreksi / Edit Jumlah Stok Kloter
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
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
              {loading ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
                  <Loader2 size={32} className="animate-spin text-[#8A7CD9]" />
                  <p className="mt-3 text-sm">Memuat data barang...</p>
                </div>
              ) : barangAktif.length === 0 ? (
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
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate font-semibold text-gray-800">
                              {item.nama || 'Tanpa nama'}
                            </p>
                            {item.varian && (
                              <span className="rounded bg-[#8A7CD9]/15 px-1.5 py-0.5 text-[11px] font-medium text-[#5B528D]">
                                {item.varian}
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-xs text-gray-500">
                            SKU: {item.sku || '-'} • Brand: {item.brand || '-'}
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
                  <div className="space-y-4 rounded-lg bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate font-semibold text-gray-800">
                            {selectedItem.nama}
                          </p>
                          {selectedItem.varian && (
                            <span className="rounded bg-[#8A7CD9]/15 px-2 py-0.5 text-[11px] font-medium text-[#5B528D]">
                              {selectedItem.varian}
                            </span>
                          )}
                        </div>

                        <p className="mt-0.5 text-xs text-gray-500">
                          SKU: {selectedItem.sku || '-'} • Brand:{' '}
                          {selectedItem.brand || '-'}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-md bg-[#EDEAFF] px-2.5 py-1 text-xs font-semibold text-[#5B528D]">
                        Satuan: {satuan}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 border-t border-gray-200 pt-3">
                      <div className="rounded-lg bg-white p-3 text-center shadow-sm">
                        <div className="flex items-center justify-center gap-1.5 text-gray-500">
                          <Warehouse size={16} />
                          <span className="text-xs">Gudang</span>
                        </div>

                        <p className="mt-1 text-lg font-bold text-gray-800">
                          {stokView.gudang}
                        </p>

                        <p className="text-[11px] text-gray-400">{satuan}</p>
                      </div>

                      <div className="rounded-lg bg-white p-3 text-center shadow-sm">
                        <div className="flex items-center justify-center gap-1.5 text-gray-500">
                          <Store size={16} />
                          <span className="text-xs">Display</span>
                        </div>

                        <p className="mt-1 text-lg font-bold text-gray-800">
                          {stokView.display}
                        </p>

                        <p className="text-[11px] text-gray-400">{satuan}</p>
                      </div>

                      <div className="rounded-lg bg-white p-3 text-center shadow-sm">
                        <div className="flex items-center justify-center gap-1.5 text-gray-500">
                          <Package size={16} />
                          <span className="text-xs">Total</span>
                        </div>

                        <p className="mt-1 text-lg font-bold text-[#5B528D]">
                          {stokView.total}
                        </p>

                        <p className="text-[11px] text-gray-400">{satuan}</p>
                      </div>
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
                    {/* OPSI KLOTER: BUAT BARU ATAU TAMBAH KE KLOTER YANG SUDAH ADA */}
                    {selectedItem?.kloter?.length > 0 ? (
                      <div className="space-y-2.5 rounded-lg border border-[#C2B6FE] bg-[#EDEAFF]/40 p-3.5">
                        <label className="block text-xs font-semibold text-[#5B528D]">
                          Pilihan Kloter Masuk:
                        </label>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="modeKloter"
                              value="baru"
                              checked={modeKloter === 'baru'}
                              onChange={() => {
                                setModeKloter('baru')
                                setIdKloterTerpilih('')
                              }}
                              className="text-[#8A7CD9] focus:ring-[#8A7CD9]"
                            />
                            <span className="font-medium text-slate-800">
                              Buat Kloter Baru (Kloter {kloterBerikutnya})
                            </span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="modeKloter"
                              value="ada"
                              checked={modeKloter === 'ada'}
                              onChange={() => {
                                setModeKloter('ada')
                                if (selectedItem?.kloter?.length > 0) {
                                  const pertama = selectedItem.kloter[0]
                                  setIdKloterTerpilih(String(pertama.id))
                                  if (pertama.tanggalKadaluarsa) {
                                    setTanggalKadaluarsa(pertama.tanggalKadaluarsa)
                                  }
                                }
                              }}
                              className="text-[#8A7CD9] focus:ring-[#8A7CD9]"
                            />
                            <span className="font-medium text-slate-800">
                              Tambah ke Kloter yang Sudah Ada
                            </span>
                          </label>
                        </div>

                        {modeKloter === 'ada' && (
                          <div className="pt-2">
                            <label className="block text-xs text-slate-600 mb-1">
                              Pilih Kloter yang ingin ditambahkan stoknya:
                            </label>
                            <select
                              value={idKloterTerpilih}
                              onChange={(e) => {
                                const val = e.target.value
                                setIdKloterTerpilih(val)
                                const k = selectedItem.kloter.find(
                                  (itemK) => String(itemK.id) === val
                                )
                                if (k?.tanggalKadaluarsa) {
                                  setTanggalKadaluarsa(k.tanggalKadaluarsa)
                                }
                              }}
                              className={`${inputClass} px-3 py-2 border-slate-300`}
                            >
                              {selectedItem.kloter.map((k) => (
                                <option key={k.id} value={String(k.id)}>
                                  Kloter {k.nomor} — Stok Gudang: {k.stokGudang} {satuan} — Exp: {k.tanggalKadaluarsa ? formatTanggal(k.tanggalKadaluarsa) : '-'}
                                </option>
                              ))}
                            </select>
                            {errors.kloter && (
                              <FieldError>{errors.kloter}</FieldError>
                            )}
                            <p className="mt-1 text-xs text-[#5B528D]">
                              * Stok yang diinput akan ditambahkan ke kloter yang dipilih (berguna jika sebelumnya input barang kurang).
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
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
                    )}

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

                    <div>
                      <label
                        htmlFor="tanggal-kedaluwarsa"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Tanggal Kedaluwarsa {modeKloter === 'ada' ? '(Mengikuti Kloter)' : ''}
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
                          disabled={modeKloter === 'ada'}
                          onChange={(e) =>
                            setTanggalKadaluarsa(e.target.value)
                          }
                          className={`${inputClass} pl-10 pr-4 ${
                            errors.tanggalKadaluarsa
                              ? 'border-red-400'
                              : 'border-gray-300'
                          } ${modeKloter === 'ada' ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                        />
                      </div>
                      <FieldError>{errors.tanggalKadaluarsa}</FieldError>
                    </div>

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

                    {errors.submit && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                        {errors.submit}
                      </div>
                    )}

                    {successMessage && (
                      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        <CheckCircle2 size={20} className="shrink-0" />
                        <span>{successMessage}</span>
                      </div>
                    )}
                    
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5B528D] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4a4275] focus:outline-none focus:ring-2 focus:ring-[#C2B6FE] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        'Simpan Pencatatan Barang'
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* MODAL KOREKSI / EDIT JUMLAH BARANG KLOTER */}
      <Modal
        isOpen={modalKoreksiOpen}
        onClose={() => setModalKoreksiOpen(false)}
        title="Koreksi / Edit Jumlah Barang Kloter"
        size="md"
      >
        <form onSubmit={handleSimpanKoreksi} className="space-y-4">
          <p className="text-xs text-slate-500">
            Gunakan fitur ini untuk memperbaiki kesalahan input, seperti kelebihan jumlah barang pada kloter tertentu atau penyesuaian stok gudang/display.
          </p>

          <div>
            <label
              htmlFor="koreksi-search"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Cari Barang (SKU / Nama)
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="koreksi-search"
                type="text"
                value={koreksiSearch}
                onChange={(e) => handleKoreksiSearchChange(e.target.value)}
                placeholder="Ketik SKU, nama barang, varian, atau brand..."
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8A7CD9]"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Menampilkan {koreksiBarangFiltered.length} dari {barangAktif.length} barang
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Pilih Barang
            </label>
            <select
              value={koreksiBarangId}
              onChange={(e) => {
                const b = barangAktif.find(
                  (item) => String(item.id) === e.target.value
                )
                pilihBarangUntukKoreksi(b || null)
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8A7CD9]"
            >
              <option value="">-- Pilih Barang --</option>
              {koreksiBarangFiltered.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.sku} - {b.nama}
                  {b.varian ? ` (${b.varian})` : ''}
                  {b.brand ? ` • ${b.brand}` : ''}
                </option>
              ))}
            </select>
          </div>

          {koreksiBarang && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Pilih Kloter
              </label>
              {koreksiBarang.kloter?.length === 0 ? (
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  Barang ini belum memiliki kloter.
                </p>
              ) : (
                <select
                  value={koreksiKloterId}
                  onChange={(e) => {
                    const kId = e.target.value
                    setKoreksiKloterId(kId)
                    const k = koreksiBarang.kloter.find((item) => String(item.id) === kId)
                    if (k) {
                      setKoreksiStokGudang(String(k.stokGudang))
                      setKoreksiStokDisplay(String(k.stokDisplay))
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8A7CD9]"
                >
                  {koreksiBarang.kloter.map((k) => (
                    <option key={k.id} value={String(k.id)}>
                      Kloter {k.nomor} (Gudang: {k.stokGudang}, Display: {k.stokDisplay}) - Exp: {k.tanggalKadaluarsa ? formatTanggal(k.tanggalKadaluarsa) : '-'}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {koreksiKloter && (
            <>
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Total saat ini:{' '}
                <strong>
                  {koreksiKloter.stokGudang + koreksiKloter.stokDisplay} pcs
                </strong>{' '}
                (Gudang {koreksiKloter.stokGudang} + Display{' '}
                {koreksiKloter.stokDisplay}). Batas masuk awal kloter:{' '}
                <strong>{koreksiKloter.jumlahAwal} pcs</strong>.
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Jumlah Stok Gudang
                </label>
                <input
                  type="number"
                  min="0"
                  value={koreksiStokGudang}
                  onChange={(e) => setKoreksiStokGudang(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8A7CD9]"
                  placeholder="0"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">Stok fisik di gudang</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Jumlah Stok Display
                </label>
                <input
                  type="number"
                  min="0"
                  value={koreksiStokDisplay}
                  onChange={(e) => setKoreksiStokDisplay(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8A7CD9]"
                  placeholder="0"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">Stok fisik di display</p>
              </div>
            </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Alasan / Catatan Koreksi
            </label>
            <input
              type="text"
              value={koreksiCatatan}
              onChange={(e) => setKoreksiCatatan(e.target.value)}
              placeholder="Contoh: Koreksi kelebihan input barang masuk"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8A7CD9]"
            />
          </div>

          {koreksiError && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
              {koreksiError}
            </div>
          )}

          {koreksiSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm flex items-center gap-2">
              <CheckCircle2 size={16} />
              {koreksiSuccess}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalKoreksiOpen(false)}
            >
              Tutup
            </Button>
            <Button
              type="submit"
              disabled={koreksiSubmitting || !koreksiKloterId}
            >
              {koreksiSubmitting ? 'Menyimpan...' : 'Simpan Koreksi Stok'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
