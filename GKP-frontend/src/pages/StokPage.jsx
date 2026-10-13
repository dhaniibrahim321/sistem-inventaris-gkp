import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Search,
  Pencil,
  Minus,
  Info,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react'

import {
  Button,
  Input,
  Textarea,
  Card,
  Badge,
  Modal,
  Table,
} from '../components/common'

import {
  setStokKloter,
  kurangiStokDisplayKloter,
  hapusKloterBarang,
} from '../services/barangService'
import {
  buatEntriRiwayat,
  tambahRiwayat,
} from '../services/riwayatService'
import { formatTanggal, sisaHari } from '../utils/dateHelpers'
import { BATAS_KEDALUWARSA_HARI } from '../utils/stokHelpers'
import {
  SEMUA_KLOTER,
  getKloterList,
  getStokView,
  kloterDefault,
} from '../utils/kloterHelpers'

const statusBadge = {
  Tersedia: <Badge variant="success">Tersedia</Badge>,
  Menipis: <Badge variant="warning">Menipis</Badge>,
  Habis: <Badge variant="danger">Habis</Badge>,
}

const rowClass = {
  Tersedia: '',
  Menipis: 'bg-amber-50/60',
  Habis: 'bg-rose-50/60',
}

const selectClass =
  'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#8A7CD9] focus:border-[#8A7CD9]'

function hitungStatus(view, stokMinimum) {
  const tersedia = view.gudang + view.display
  if (tersedia === 0) return 'Habis'
  if (tersedia <= stokMinimum) return 'Menipis'
  return 'Tersedia'
}

function KadaluarsaCell({ tanggal }) {
  if (!tanggal) return <span className="text-slate-300">-</span>

  const sisa = sisaHari(tanggal)
  let warna = 'text-slate-700'
  let keterangan = null

  if (sisa !== null && sisa <= 0) {
    warna = 'text-rose-600 font-medium'
    keterangan = 'Kedaluwarsa'
  } else if (sisa !== null && sisa <= BATAS_KEDALUWARSA_HARI) {
    warna = 'text-amber-700 font-medium'
    keterangan = `${sisa} hari lagi`
  }

  return (
    <div>
      <p className={warna}>{formatTanggal(tanggal)}</p>
      {keterangan && (
        <p className="text-[11px] text-slate-400">{keterangan}</p>
      )}
    </div>
  )
}

export default function StokBarangPage({
  barang = [],
  setBarang,
  setRiwayat,
}) {
  // Dashboard (Mendekati Kedaluwarsa) membawa { barangId, kloterId } lewat
  // navigasi: barang & kloter itu langsung disorot supaya bisa diedit atau
  // dihapus.
  const location = useLocation()
  const barangFokusAwal =
    barang.find((item) => item.id === location.state?.barangId) || null
  const kloterFokusAwal = barangFokusAwal
    ? getKloterList(barangFokusAwal).find(
        (k) => String(k.id) === String(location.state?.kloterId)
      ) || null
    : null

  const [fokus, setFokus] = useState(
    barangFokusAwal && kloterFokusAwal
      ? { barangId: barangFokusAwal.id, kloterId: kloterFokusAwal.id }
      : null
  )

  const [search, setSearch] = useState(
    barangFokusAwal && kloterFokusAwal ? String(barangFokusAwal.sku || '') : ''
  )

  // Pilihan kloter per baris: { [idBarang]: 'all' | idKloter }
  const [pilihanKloter, setPilihanKloter] = useState(
    barangFokusAwal && kloterFokusAwal
      ? { [barangFokusAwal.id]: String(kloterFokusAwal.id) }
      : {}
  )

  // Modal: { type: 'edit' | 'kurangi' | 'hapus', itemId, kloterId }
  const [modal, setModal] = useState(null)
  const [stokGudang, setStokGudang] = useState('')
  const [stokDisplay, setStokDisplay] = useState('')
  const [jumlahKurang, setJumlahKurang] = useState('')
  const [catatan, setCatatan] = useState('')
  const [error, setError] = useState('')

  /* =========================================
     DATA TABEL (ikut kloter yang dipilih per baris)
  ========================================== */

  const rows = useMemo(() => {
    const keyword = search.toLowerCase().trim()

    return barang
      .filter((item) => {
        if (!keyword) return true
        return (
          String(item.sku || '').toLowerCase().includes(keyword) ||
          String(item.nama || '').toLowerCase().includes(keyword) ||
          String(item.kategori || '').toLowerCase().includes(keyword)
        )
      })
      .map((item) => {
        const key = pilihanKloter[item.id] ?? SEMUA_KLOTER
        const view = getStokView(item, key)
        const kloterList = getKloterList(item)
        const stokMinimum = Number(item.stokMinimum ?? 0)

        return {
          ...item,
          kloterList,
          kloterKey: view.kloter ? key : SEMUA_KLOTER,
          view,
          status: hitungStatus(view, stokMinimum),
        }
      })
  }, [barang, search, pilihanKloter])

  /* =========================================
     MODAL
  ========================================== */

  const modalItem = modal
    ? barang.find((item) => item.id === modal.itemId) || null
    : null
  const modalKloterList = getKloterList(modalItem)
  const modalKloter =
    modalKloterList.find((k) => String(k.id) === String(modal?.kloterId)) ||
    null

  function isiFormDariKloter(kloter) {
    setStokGudang(kloter ? String(kloter.stokGudang) : '')
    setStokDisplay(kloter ? String(kloter.stokDisplay) : '')
    setJumlahKurang('')
    setError('')
  }

  function bukaModalUntuk(type, itemId, kloter) {
    setModal({ type, itemId, kloterId: String(kloter.id) })
    isiFormDariKloter(kloter)
    setCatatan('')
  }

  function bukaModal(type, row) {
    const list = row.kloterList
    if (list.length === 0) return

    // Pakai kloter yang sedang dipilih di baris; kalau "Semua", ambil
    // kloter dengan kedaluwarsa terdekat.
    const awal =
      row.view.kloter ?? kloterDefault(list)

    bukaModalUntuk(type, row.id, awal)
  }

  function tutupModal() {
    setModal(null)
    setError('')
  }

  function gantiKloterModal(kloterId) {
    const kloter = modalKloterList.find((k) => String(k.id) === kloterId)
    setModal((prev) => ({ ...prev, kloterId }))
    isiFormDariKloter(kloter)
  }

  /* =========================================
     SIMPAN EDIT
  ========================================== */

  function simpanEdit() {
    if (!modalItem || !modalKloter) return

    const gudang = Number(stokGudang)
    const display = Number(stokDisplay)

    if (
      stokGudang === '' ||
      stokDisplay === '' ||
      !Number.isInteger(gudang) ||
      !Number.isInteger(display) ||
      gudang < 0 ||
      display < 0
    ) {
      setError('Stok gudang dan display harus berupa bilangan bulat 0 atau lebih.')
      return
    }

    if (gudang + display > modalKloter.jumlahAwal) {
      setError(
        `Gudang + display (${gudang + display}) tidak boleh melebihi jumlah masuk awal Kloter ${modalKloter.nomor} (${modalKloter.jumlahAwal}).`
      )
      return
    }

    const gudangLama = modalKloter.stokGudang
    const displayLama = modalKloter.stokDisplay

    setBarang((prev) =>
      setStokKloter(prev, modalItem.id, modalKloter.id, {
        stokGudang: gudang,
        stokDisplay: display,
      })
    )

    if (setRiwayat && (gudang !== gudangLama || display !== displayLama)) {
      setRiwayat((prev) =>
        tambahRiwayat(
          prev,
          buatEntriRiwayat({
            jenis: 'stok',
            sku: modalItem.sku,
            nama: modalItem.nama,
            kloter: modalKloter.nomor,
            keterangan:
              `Stok Kloter ${modalKloter.nomor} disesuaikan manual. ` +
              `Gudang ${gudangLama} → ${gudang}, ` +
              `Display ${displayLama} → ${display}.`,
          })
        )
      )
    }

    tutupModal()
  }

  /* =========================================
     SIMPAN KURANGI (hanya stok display)
  ========================================== */

  function simpanKurangi() {
    if (!modalItem || !modalKloter) return

    const jumlah = Number(jumlahKurang)

    if (!jumlahKurang || !Number.isInteger(jumlah) || jumlah <= 0) {
      setError('Jumlah yang dikurangi harus bilangan bulat lebih dari 0.')
      return
    }

    if (jumlah > modalKloter.stokDisplay) {
      setError(
        `Jumlah melebihi stok display Kloter ${modalKloter.nomor} (${modalKloter.stokDisplay}).`
      )
      return
    }

    const displayBaru = modalKloter.stokDisplay - jumlah
    const satuan = modalItem.satuan || 'pcs'
    const catatanTrim = catatan.trim()

    setBarang((prev) =>
      kurangiStokDisplayKloter(prev, modalItem.id, modalKloter.id, jumlah)
    )

    if (setRiwayat) {
      setRiwayat((prev) =>
        tambahRiwayat(
          prev,
          buatEntriRiwayat({
            jenis: 'stok',
            sku: modalItem.sku,
            nama: modalItem.nama,
            kloter: modalKloter.nomor,
            keterangan:
              `Stok Kloter ${modalKloter.nomor} dikurangi -${jumlah} ${satuan}. ` +
              `Display ${modalKloter.stokDisplay} → ${displayBaru}. ` +
              `Total kloter tetap ${modalKloter.jumlahAwal}.` +
              (catatanTrim ? ` Catatan: ${catatanTrim}` : ''),
          })
        )
      )
    }

    tutupModal()
  }

  /* =========================================
     SIMPAN HAPUS KLOTER
     Stok gudang, stok display, dan tanggal kedaluwarsa terdekat barang
     dihitung ulang dari kloter yang tersisa, sehingga Dashboard dan
     halaman lain ikut menyesuaikan.
  ========================================== */

  function simpanHapus() {
    if (!modalItem || !modalKloter) return

    const kloter = modalKloter
    const item = modalItem

    setBarang((prev) => hapusKloterBarang(prev, item.id, kloter.id))

    // Baris ini tidak boleh lagi menunjuk kloter yang sudah hilang.
    setPilihanKloter((prev) => ({ ...prev, [item.id]: SEMUA_KLOTER }))

    if (
      fokus &&
      fokus.barangId === item.id &&
      String(fokus.kloterId) === String(kloter.id)
    ) {
      setFokus(null)
    }

    if (setRiwayat) {
      const sisa = sisaHari(kloter.tanggalKadaluarsa)
      const status =
        sisa === null
          ? ''
          : sisa <= 0
            ? ' (sudah kedaluwarsa)'
            : ` (${sisa} hari lagi kedaluwarsa)`

      setRiwayat((prev) =>
        tambahRiwayat(
          prev,
          buatEntriRiwayat({
            jenis: 'stok',
            sku: item.sku,
            nama: item.nama,
            kloter: kloter.nomor,
            keterangan:
              `Kloter ${kloter.nomor} dihapus dari Stok Barang. ` +
              `Tanggal kedaluwarsa: ${formatTanggal(kloter.tanggalKadaluarsa)}${status}. ` +
              `Stok yang ikut terhapus: Gudang ${kloter.stokGudang}, Display ${kloter.stokDisplay}.`,
          })
        )
      )
    }

    tutupModal()
  }

  /* =========================================
     KLOTER YANG DISOROT (dari Dashboard)
  ========================================== */

  const itemFokus = fokus
    ? barang.find((item) => item.id === fokus.barangId) || null
    : null
  const kloterFokus = itemFokus
    ? getKloterList(itemFokus).find(
        (k) => String(k.id) === String(fokus.kloterId)
      ) || null
    : null

  /* =========================================
     KOLOM TABEL
  ========================================== */

  const columns = [
    { key: 'sku', label: 'SKU' },
    { key: 'nama', label: 'Nama Barang' },
    {
      key: 'kategori',
      label: 'Kategori',
      render: (value) => <Badge variant="default">{value || '-'}</Badge>,
    },
    {
      key: 'kloter',
      label: 'Kloter',
      render: (_, row) =>
        row.kloterList.length === 0 ? (
          <span className="text-xs text-slate-400">Belum ada kloter</span>
        ) : (
          <select
            value={row.kloterKey}
            onChange={(e) =>
              setPilihanKloter((prev) => ({
                ...prev,
                [row.id]: e.target.value,
              }))
            }
            aria-label={`Pilih kloter ${row.nama}`}
            className={selectClass}
          >
            <option value={SEMUA_KLOTER}>Semua kloter</option>
            {row.kloterList.map((k) => (
              <option key={k.id} value={String(k.id)}>
                Kloter {k.nomor}
              </option>
            ))}
          </select>
        ),
    },
    {
      key: 'kadaluarsa',
      label: 'Kedaluwarsa',
      render: (_, row) => <KadaluarsaCell tanggal={row.view.kadaluarsa} />,
    },
    {
      key: 'stokGudang',
      label: 'Stok Gudang',
      render: (_, row) => row.view.gudang,
    },
    {
      key: 'stokDisplay',
      label: 'Stok Display',
      render: (_, row) => row.view.display,
    },
    {
      key: 'total',
      label: 'Total',
      render: (_, row) => (
        <span className="font-semibold text-slate-800">{row.view.total}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => statusBadge[row.status],
    },
    {
      key: 'aksi',
      label: 'Aksi',
      render: (_, row) => {
        const tanpaKloter = row.kloterList.length === 0
        const tombol =
          'rounded-lg border p-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => bukaModal('edit', row)}
              disabled={tanpaKloter}
              title={tanpaKloter ? 'Belum ada kloter' : 'Edit stok'}
              aria-label={`Edit stok ${row.nama}`}
              className={`${tombol} border-slate-200 text-slate-600 hover:bg-slate-50`}
            >
              <Pencil size={15} />
            </button>

            <button
              type="button"
              onClick={() => bukaModal('kurangi', row)}
              disabled={tanpaKloter}
              title={tanpaKloter ? 'Belum ada kloter' : 'Kurangi stok display'}
              aria-label={`Kurangi stok ${row.nama}`}
              className={`${tombol} border-rose-200 text-rose-600 hover:bg-rose-50`}
            >
              <Minus size={15} />
            </button>

            <button
              type="button"
              onClick={() => bukaModal('hapus', row)}
              disabled={tanpaKloter}
              title={tanpaKloter ? 'Belum ada kloter' : 'Hapus kloter'}
              aria-label={`Hapus kloter ${row.nama}`}
              className={`${tombol} border-red-200 text-red-600 hover:bg-red-50`}
            >
              <Trash2 size={15} />
            </button>
          </div>
        )
      },
    },
  ]

  /* =========================================
     RENDER
  ========================================== */

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-800">
          Stok Barang
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Lihat dan kelola stok gudang dan display berdasarkan kloter. Kloter yang sudah kedaluwarsa dapat diedit atau dihapus di sini.
        </p>
      </header>

      {barang.length === 0 ? (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center text-sm text-slate-400">
          Belum ada data barang. Tambahkan barang lewat halaman Kelola Data
          Barang terlebih dahulu.
        </section>
      ) : (
        <>
          <section aria-label="Pencarian stok">
            <Card>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <label htmlFor="cari-stok" className="sr-only">
                  Cari SKU, nama barang, atau kategori
                </label>
                <input
                  id="cari-stok"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari SKU, nama barang, atau kategori..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8A7CD9] focus:border-[#8A7CD9]"
                />
              </div>
            </Card>
          </section>

          {itemFokus && kloterFokus && (
            <BannerKloterFokus
              item={itemFokus}
              kloter={kloterFokus}
              onEdit={() => bukaModalUntuk('edit', itemFokus.id, kloterFokus)}
              onHapus={() => bukaModalUntuk('hapus', itemFokus.id, kloterFokus)}
              onTutup={() => setFokus(null)}
            />
          )}

          <section aria-label="Tabel stok barang">
            <Table
              columns={columns}
              data={rows}
              rowClassName={(row) =>
                `${rowClass[row.status]} ${
                  fokus && row.id === fokus.barangId
                    ? 'bg-[#EDEAFF]/70 outline outline-2 -outline-offset-2 outline-[#8A7CD9]'
                    : ''
                }`
              }
            />
          </section>
        </>
      )}

      {/* =====================================
          MODAL EDIT
      ====================================== */}

      <Modal
        isOpen={modal?.type === 'edit' && !!modalItem}
        onClose={tutupModal}
        title="Edit Stok Kloter"
        size="sm"
      >
        {modalItem && modalKloter && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">{modalItem.nama}</p>

            <KloterSelect
              list={modalKloterList}
              value={String(modalKloter.id)}
              onChange={gantiKloterModal}
            />

            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 flex items-start gap-2">
              <Info size={14} className="mt-0.5 shrink-0" />
              <p>
                Total Kloter {modalKloter.nomor} tetap{' '}
                <strong>{modalKloter.jumlahAwal}</strong> (jumlah masuk awal).
                Gudang + display tidak boleh melebihi angka ini.
              </p>
            </div>

            <Input
              label="Stok Gudang"
              name="edit-stok-gudang"
              type="number"
              min="0"
              value={stokGudang}
              onChange={(e) => setStokGudang(e.target.value)}
            />

            <Input
              label="Stok Display"
              name="edit-stok-display"
              type="number"
              min="0"
              value={stokDisplay}
              onChange={(e) => setStokDisplay(e.target.value)}
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={tutupModal}>
                Batal
              </Button>
              <Button onClick={simpanEdit}>Simpan</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* =====================================
          MODAL KURANGI
      ====================================== */}

      <Modal
        isOpen={modal?.type === 'kurangi' && !!modalItem}
        onClose={tutupModal}
        title="Kurangi Stok Display"
        size="sm"
      >
        {modalItem && modalKloter && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">{modalItem.nama}</p>

            <KloterSelect
              list={modalKloterList}
              value={String(modalKloter.id)}
              onChange={gantiKloterModal}
            />

            <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Stok display kloter ini</span>
                <strong className="text-slate-800">
                  {modalKloter.stokDisplay}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total kloter (tetap)</span>
                <strong className="text-slate-800">
                  {modalKloter.jumlahAwal}
                </strong>
              </div>
            </div>

            {modalKloter.stokDisplay === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                Stok display Kloter {modalKloter.nomor} kosong. Pindahkan dulu
                dari gudang lewat halaman Pergerakan Barang.
              </p>
            ) : (
              <>
                <Input
                  label="Jumlah yang Dikurangi"
                  name="jumlah-kurang"
                  type="number"
                  min="1"
                  value={jumlahKurang}
                  onChange={(e) => setJumlahKurang(e.target.value)}
                  placeholder={`Maksimal ${modalKloter.stokDisplay}`}
                />

                <Textarea
                  label="Catatan"
                  name="catatan-kurang"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Contoh: Terjual, rusak, atau hilang."
                />
              </>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={tutupModal}>
                Batal
              </Button>
              <Button
                variant="danger"
                onClick={simpanKurangi}
                disabled={modalKloter.stokDisplay === 0}
              >
                Kurangi Stok
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* =====================================
          MODAL HAPUS KLOTER
      ====================================== */}

      <Modal
        isOpen={modal?.type === 'hapus' && !!modalItem}
        onClose={tutupModal}
        title="Hapus Kloter"
        size="sm"
      >
        {modalItem && modalKloter && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">{modalItem.nama}</p>

            <KloterSelect
              list={modalKloterList}
              value={String(modalKloter.id)}
              onChange={gantiKloterModal}
            />

            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <p className="text-sm font-medium text-slate-800">
                Apakah benar akan menghapus Kloter {modalKloter.nomor}? Stok
                kloter ini akan ikut terhapus dari sistem.
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal kedaluwarsa</span>
                <strong className="text-slate-800">
                  {formatTanggal(modalKloter.tanggalKadaluarsa)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Stok gudang</span>
                <strong className="text-slate-800">
                  {modalKloter.stokGudang}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Stok display</span>
                <strong className="text-slate-800">
                  {modalKloter.stokDisplay}
                </strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={tutupModal}>
                Batal
              </Button>
              <Button variant="danger" onClick={simpanHapus}>
                Hapus Kloter
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// Pemberitahuan di atas tabel saat datang dari Dashboard (Mendekati
// Kedaluwarsa): menunjukkan kloter yang dimaksud beserta aksi cepatnya.
function BannerKloterFokus({ item, kloter, onEdit, onHapus, onTutup }) {
  const sisa = sisaHari(kloter.tanggalKadaluarsa)
  const sudahLewat = sisa !== null && sisa <= 0

  return (
    <section
      aria-label="Kloter yang perlu ditangani"
      className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${
        sudahLewat
          ? 'border-rose-200 bg-rose-50'
          : 'border-amber-200 bg-amber-50'
      }`}
    >
      <AlertTriangle
        size={18}
        className={sudahLewat ? 'text-rose-500' : 'text-amber-500'}
      />

      <p className="min-w-0 flex-1 text-sm text-slate-700">
        <strong>
          {item.nama} — Kloter {kloter.nomor}
        </strong>{' '}
        {sudahLewat
          ? 'sudah kedaluwarsa'
          : `akan kedaluwarsa ${sisa} hari lagi`}{' '}
        ({formatTanggal(kloter.tanggalKadaluarsa)}). Edit atau hapus kloter
        ini.
      </p>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil size={14} className="mr-1.5" />
          Edit Kloter
        </Button>
        <Button size="sm" variant="danger" onClick={onHapus}>
          <Trash2 size={14} className="mr-1.5" />
          Hapus Kloter
        </Button>
        <button
          type="button"
          onClick={onTutup}
          aria-label="Tutup pemberitahuan"
          className="rounded-md p-1.5 text-slate-400 hover:bg-white/70 hover:text-slate-600"
        >
          <X size={16} />
        </button>
      </div>
    </section>
  )
}

function KloterSelect({ list, value, onChange }) {
  return (
    <div>
      <label
        htmlFor="modal-kloter"
        className="block text-sm font-medium text-slate-700 mb-1"
      >
        Kloter
      </label>
      <select
        id="modal-kloter"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8A7CD9] focus:border-[#8A7CD9]"
      >
        {list.map((k) => (
          <option key={k.id} value={String(k.id)}>
            Kloter {k.nomor} — Exp. {formatTanggal(k.tanggalKadaluarsa)}
          </option>
        ))}
      </select>
    </div>
  )
}
