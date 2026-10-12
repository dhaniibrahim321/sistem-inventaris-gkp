import { useState } from 'react'
import { CheckCircle2, ClipboardCheck } from 'lucide-react'
import { Button, Input, Card, Badge, Table } from '../components/common'
import { setStokGudangHasilOpname } from '../services/barangService'
import { buatEntriRiwayat, tambahRiwayat } from '../services/riwayatService'
import { todayISOString } from '../utils/dateHelpers'

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

export default function StockOpnamePage({ barang, setBarang, setRiwayat }) {
  const [tanggal, setTanggal] = useState(todayISOString())
  const [stokFisik, setStokFisik] = useState({})
  const [successSummary, setSuccessSummary] = useState(null)

  function handleFisikChange(id, value) {
    setSuccessSummary(null)
    setStokFisik((prev) => ({ ...prev, [id]: value }))
  }

  const rows = barang.map((item) => {
    const rawValue = stokFisik[item.id]
    const hasInput = rawValue !== undefined && rawValue !== ''
    const fisik = hasInput ? Number(rawValue) : null
    const selisih = hasInput ? fisik - item.stokGudang : null
    const status = hasInput ? getStatus(selisih) : null
    return { ...item, fisik, selisih, status, hasInput }
  })

  const jumlahDiisi = rows.filter((r) => r.hasInput).length
  const jumlahSesuai = rows.filter((r) => r.status === 'sesuai').length
  const jumlahKurang = rows.filter((r) => r.status === 'kurang').length
  const jumlahLebih = rows.filter((r) => r.status === 'lebih').length

  function handleSubmit(e) {
    e.preventDefault()
    if (jumlahDiisi === 0) return

    const rowsDiisi = rows.filter((row) => row.hasInput)

    setBarang((prev) => {
      let next = prev
      rowsDiisi.forEach((row) => {
        next = setStokGudangHasilOpname(next, row.id, row.fisik)
      })
      return next
    })

    setRiwayat((prev) => {
      let next = prev
      rowsDiisi.forEach((row) => {
        const entry = buatEntriRiwayat({
          jenis: 'opname',
          sku: row.sku,
          nama: row.nama,
          keterangan: `Selisih opname: ${row.selisih > 0 ? `+${row.selisih}` : row.selisih} ${row.satuan} (${
            row.status === 'sesuai' ? 'sesuai' : row.status === 'kurang' ? 'kurang' : 'lebih'
          })`,
        })
        next = tambahRiwayat(next, entry)
      })
      return next
    })

    setSuccessSummary({
      total: jumlahDiisi,
      sesuai: jumlahSesuai,
      kurang: jumlahKurang,
      lebih: jumlahLebih,
    })
    setStokFisik({})
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
      label: 'Stok Sistem',
      render: (value, row) => `${value} ${row.satuan}`,
    },
    {
      key: 'fisik',
      label: 'Stok Fisik',
      render: (_, row) => (
        <input
          type="number"
          min="0"
          value={stokFisik[row.id] ?? ''}
          onChange={(e) => handleFisikChange(row.id, e.target.value)}
          placeholder="0"
          aria-label={`Stok fisik ${row.nama}`}
          className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
        />
      ),
    },
    {
      key: 'selisih',
      label: 'Selisih',
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
      render: (_, row) => (row.hasInput ? statusBadge[row.status] : <span className="text-slate-300">-</span>),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <header>
        <h1 className="text-xl font-semibold text-slate-800">Stock Opname</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Hitung stok fisik gudang dan bandingkan otomatis dengan stok sistem.
        </p>
      </header>

      {successSummary && (
        <div className="flex items-start gap-2 rounded-lg bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">
          <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          <p>
            Hasil opname untuk {successSummary.total} barang berhasil disimpan &mdash;{' '}
            {successSummary.sesuai} sesuai, {successSummary.kurang} kurang, {successSummary.lebih} lebih.
            Stok sistem telah disesuaikan dengan hasil hitung fisik.
          </p>
        </div>
      )}

      {barang.length === 0 ? (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center text-sm text-slate-400">
          Belum ada data barang. Tambahkan barang lewat halaman Master Data Barang terlebih dahulu.
        </section>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <section aria-label="Tanggal opname">
            <Card>
              <div className="max-w-xs">
                <Input
                  label="Tanggal Opname"
                  name="tanggal"
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                />
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

          {/* Ringkasan & Submit */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="text-slate-500">{jumlahDiisi} dari {rows.length} barang diisi</span>
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
