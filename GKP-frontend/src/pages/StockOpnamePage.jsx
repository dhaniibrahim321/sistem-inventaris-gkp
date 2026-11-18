import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ClipboardCheck, Info } from 'lucide-react'
import { Button, Input, Card, Badge, Table } from '../components/common'
import * as opnameService from '../services/opnameService'
import { setStokDisplayHasilOpname } from '../services/barangService'
import { buatEntriRiwayat, tambahRiwayat } from '../services/riwayatService'
import { todayISOString } from '../utils/dateHelpers'
import { getKloterList } from '../utils/kloterHelpers'

function getStatus(selisih) {
  if (selisih === 0) return 'sesuai'
  if (selisih < 0) return 'kurang'
  return 'lebih'
}

const statusBadge = {
  sesuai: <Badge variant="success">Sesuai</Badge>,
  kurang: <Badge variant="danger">Kurang</Badge>,
  lebih: <Badge variant="warning">Lebih</Badge>,
}

const rowClass = {
  kurang: 'bg-rose-50/60',
  lebih: 'bg-amber-50/60',
  sesuai: '',
}

const focusClass =
  'focus:outline-none focus:ring-2 focus:ring-[#8A7CD9] focus:border-[#8A7CD9]'

export default function StockOpnamePage({ barang = [], setBarang, setRiwayat }) {
  const [dbBarang, setDbBarang] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorSubmit, setErrorSubmit] = useState('')

  const muatDataOpname = async () => {
    try {
      setLoading(true)
      const data = await opnameService.getOpnameFormData()
      if (Array.isArray(data)) {
        const mapped = data.map((b) => ({
          id: b.id_barang,
          sku: b.sku,
          nama: b.nama_barang,
          kategori: b.kategori,
          stokGudang: Number(b.stok_gudang || 0),
          stokDisplay: Number(b.stok_display || 0),
          totalStok: Number(b.total_stok || 0),
          kloter: (b.kloter || []).map((k) => ({
            id: k.id_kloter,
            nomor: String(k.nama_kloter || '').replace(/[^0-9]/g, '') || k.nama_kloter || 1,
            namaKloter: k.nama_kloter,
            tanggalKadaluarsa: k.tanggal_kedaluwarsa,
            stokGudang: Number(k.stok_gudang || 0),
            stokDisplay: Number(k.stok_display || 0),
            jumlahAwal: Number(k.jumlah_awal || (k.stok_gudang + k.stok_display) || 0),
          })),
        }))
        setDbBarang(mapped)
      }
    } catch (err) {
      console.warn('Gagal memuat data opname dari backend:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    muatDataOpname()
  }, [])

  const barangAktif = dbBarang ?? (barang || [])

  const [tanggal, setTanggal] = useState(todayISOString())

  // Kloter yang dipilih per baris: { [idBarang]: idKloter }
  const [pilihanKloter, setPilihanKloter] = useState({})

  // Stok fisik per (barang, kloter): { 'idBarang:idKloter': '12' }
  const [stokFisik, setStokFisik] = useState({})
  const [successSummary, setSuccessSummary] = useState(null)

  function handleFisikChange(inputKey, value) {
    setSuccessSummary(null)
    setStokFisik((prev) => ({ ...prev, [inputKey]: value }))
  }

  /* =========================================
     BARIS TABEL
     Stok gudang & display dibaca langsung dari state barang pada setiap
     render, jadi selalu real-time. Perbandingan opname: stok fisik vs
     stok DISPLAY kloter yang dipilih.
  ========================================== */

  const rows = useMemo(() => {
    return barangAktif.map((item) => {
      const kloterList = getKloterList(item)
      const kloter =
        kloterList.find(
          (k) => String(k.id) === String(pilihanKloter[item.id])
        ) ??
        kloterList[0] ??
        null

      const inputKey = kloter ? `${item.id}:${kloter.id}` : null
      const rawValue = inputKey ? stokFisik[inputKey] : undefined
      const angka = rawValue === undefined || rawValue === '' ? null : Number(rawValue)
      const valid = angka !== null && Number.isInteger(angka) && angka >= 0
      const invalid = angka !== null && !valid

      const display = kloter?.stokDisplay ?? 0
      const fisik = valid ? angka : null
      const selisih = valid ? fisik - display : null

      return {
        ...item,
        kloterList,
        kloter,
        inputKey,
        gudang: kloter?.stokGudang ?? 0,
        masukAwal: kloter?.jumlahAwal ?? 0,
        display,
        fisik,
        selisih,
        status: valid ? getStatus(selisih) : null,
        hasInput: valid,
        invalid,
      }
    })
  }, [barangAktif, pilihanKloter, stokFisik])

  const jumlahDiisi = rows.filter((r) => r.hasInput).length
  const jumlahSesuai = rows.filter((r) => r.status === 'sesuai').length
  const jumlahKurang = rows.filter((r) => r.status === 'kurang').length
  const jumlahLebih = rows.filter((r) => r.status === 'lebih').length

  async function handleSubmit(e) {
    e.preventDefault()
    if (jumlahDiisi === 0) return

    const rowsDiisi = rows.filter((row) => row.hasInput)
    setSubmitting(true)
    setErrorSubmit('')

    try {
      const payload = {
        tanggal_opname: tanggal,
        items: rowsDiisi.map((row) => ({
          id_kloter: Number(row.kloter.id),
          stok_fisik: Number(row.fisik),
        })),
      }
      await opnameService.simpanOpname(payload)
      await muatDataOpname()
    } catch (err) {
      console.warn('Backend simpan opname error, fallback lokal:', err.message)
      setErrorSubmit(err.message)
    } finally {
      setSubmitting(false)
    }

    if (setBarang) {
      setBarang((prev) => {
        let next = prev
        rowsDiisi.forEach((row) => {
          next = setStokDisplayHasilOpname(next, row.id, row.kloter.id, row.fisik)
        })
        return next
      })
    }

    if (setRiwayat) {
      setRiwayat((prev) => {
        let next = prev
        rowsDiisi.forEach((row) => {
          const satuan = row.satuan || 'pcs'
          const tandaSelisih = row.selisih > 0 ? `+${row.selisih}` : row.selisih

          next = tambahRiwayat(
            next,
            buatEntriRiwayat({
              jenis: 'opname',
              sku: row.sku,
              nama: row.nama,
              tanggalTransaksi: tanggal,
              kloter: row.kloter.nomor,
              keterangan:
                `Kloter ${row.kloter.nomor}: stok display sistem ${row.display} → stok fisik ${row.fisik}. ` +
                `Selisih opname: ${tandaSelisih} ${satuan} (${row.status}). ` +
                `Tanggal opname: ${tanggal}.`,
            })
          )
        })
        return next
      })
    }

    setSuccessSummary({
      total: jumlahDiisi,
      sesuai: jumlahSesuai,
      kurang: jumlahKurang,
      lebih: jumlahLebih,
    })

    // Hapus hanya isian yang baru disimpan.
    setStokFisik((prev) => {
      const sisa = { ...prev }
      rowsDiisi.forEach((row) => delete sisa[row.inputKey])
      return sisa
    })
  }

  /* =========================================
     KOLOM
     No | SKU | Nama Barang | Kategori | Kloter | Stok Gudang (Sistem) |
     Stok Display | Stok Fisik | Selisih | Status
  ========================================== */

  const columns = [
    {
      key: 'no',
      label: 'No',
      render: (_, __, index) => index + 1,
    },
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
            value={String(row.kloter.id)}
            onChange={(e) =>
              setPilihanKloter((prev) => ({
                ...prev,
                [row.id]: e.target.value,
              }))
            }
            aria-label={`Pilih kloter ${row.nama}`}
            className={`rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 ${focusClass}`}
          >
            {row.kloterList.map((k) => (
              <option key={k.id} value={String(k.id)}>
                Kloter {k.nomor}
              </option>
            ))}
          </select>
        ),
    },
    {
      key: 'gudang',
      label: 'Stok Gudang (Sistem)',
      render: (_, row) =>
        row.kloter ? (
          <div>
            <p className="font-medium text-slate-800">
              {row.gudang} {row.satuan}
            </p>
            <p className="text-[11px] text-slate-400">
              dari {row.masukAwal} masuk
            </p>
          </div>
        ) : (
          <span className="text-slate-300">-</span>
        ),
    },
    {
      key: 'display',
      label: 'Stok Display',
      render: (_, row) =>
        row.kloter ? (
          `${row.display} ${row.satuan}`
        ) : (
          <span className="text-slate-300">-</span>
        ),
    },
    {
      key: 'fisik',
      label: 'Stok Fisik',
      render: (_, row) => (
        <input
          type="number"
          min="0"
          step="1"
          value={row.inputKey ? stokFisik[row.inputKey] ?? '' : ''}
          onChange={(e) => handleFisikChange(row.inputKey, e.target.value)}
          placeholder="0"
          disabled={!row.kloter}
          aria-label={`Stok fisik ${row.nama}`}
          aria-invalid={row.invalid}
          className={`w-24 px-2.5 py-1.5 rounded-lg border text-sm disabled:bg-slate-100 disabled:cursor-not-allowed ${focusClass} ${
            row.invalid ? 'border-red-500' : 'border-slate-300'
          }`}
        />
      ),
    },
    {
      key: 'selisih',
      label: 'Jumlah Selisih',
      render: (_, row) =>
        row.hasInput ? (
          <span
            className={`font-medium ${
              row.selisih === 0
                ? 'text-emerald-600'
                : row.selisih < 0
                ? 'text-red-600'
                : 'text-amber-700'
            }`}
          >
            {row.selisih > 0 ? `+${row.selisih}` : row.selisih} {row.satuan}
          </span>
        ) : (
          <span className="text-slate-300">-</span>
        ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) =>
        row.hasInput ? (
          statusBadge[row.status]
        ) : (
          <span className="text-slate-300">-</span>
        ),
    },
  ]

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-800">Stok Opname</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Hitung stok fisik di display dan bandingkan dengan stok display
          sistem, per kloter.
        </p>
      </header>

      {successSummary && (
        <div className="flex items-start gap-2 rounded-lg bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">
          <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          <p>
            Hasil opname untuk {successSummary.total} kloter berhasil disimpan
            &mdash; {successSummary.sesuai} sesuai, {successSummary.kurang}{' '}
            kurang, {successSummary.lebih} lebih. Stok display sistem telah
            disesuaikan dengan hasil hitung fisik.
          </p>
        </div>
      )}

      {barang.length === 0 ? (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center text-sm text-slate-400">
          Belum ada data barang. Tambahkan barang lewat halaman Kelola Data
          Barang terlebih dahulu.
        </section>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <section aria-label="Tanggal opname">
            <Card>
              <div className="flex flex-wrap items-end gap-6">
                <div className="w-full max-w-xs">
                  <Input
                    label="Tanggal Opname"
                    name="tanggal"
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                  />
                </div>

                <p className="flex items-start gap-2 text-xs text-slate-500 max-w-md pb-2">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  Stok gudang tampil sebagai acuan dan selalu terbaru. Selisih
                  dihitung dari stok fisik dikurangi stok display.
                </p>
              </div>
            </Card>
          </section>

          <section aria-label="Tabel hitung stok fisik">
            <Table
              columns={columns}
              data={rows}
              rowClassName={(row) => (row.hasInput ? rowClass[row.status] : '')}
            />
          </section>

          <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="text-slate-500">
                {jumlahDiisi} dari {rows.length} barang diisi
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                {jumlahSesuai} sesuai
              </span>
              <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-medium">
                {jumlahKurang} kurang
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
                {jumlahLebih} lebih
              </span>
            </div>
            <Button type="submit" disabled={jumlahDiisi === 0}>
              <ClipboardCheck size={16} className="mr-1.5" />
              Simpan Hasil Opname
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
