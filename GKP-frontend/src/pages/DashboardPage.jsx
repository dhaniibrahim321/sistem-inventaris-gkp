import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  Package,
  Warehouse,
  Store,
  AlertTriangle,
  Clock,
  PackagePlus,
  ArrowLeftRight,
  ClipboardCheck,
  ChevronRight,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react'

import {
  formatTanggal,
  sisaHari,
  todayISOString,
} from '../utils/dateHelpers'
import { sortRiwayatTerbaru } from '../services/riwayatService'
import { getKloterList } from '../utils/kloterHelpers'
import ProductImage from '../components/dashboard/ProductImage'
import SkuSearch from '../components/dashboard/SkuSearch'

const MAKS_HARI_RENTANG = 31
const MAKS_AKTIVITAS = 50

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const activityIcon = {
  barang: { icon: Package, className: 'bg-sky-50 text-sky-600' },
  stok: { icon: Warehouse, className: 'bg-emerald-50 text-emerald-600' },
  masuk: { icon: PackagePlus, className: 'bg-violet-50 text-violet-600' },
  pergerakan: { icon: ArrowLeftRight, className: 'bg-pink-50 text-pink-600' },
  opname: { icon: ClipboardCheck, className: 'bg-amber-50 text-amber-600' },
}

function getJumlah(entry) {
  if (typeof entry.jumlah === 'number') return entry.jumlah
  const match = String(entry.keterangan ?? '').match(/\d+/)
  return match ? Number(match[0]) : 0
}

function tanggalTransaksi(entry) {
  return entry.tanggalTransaksi || entry.tanggal
}

function geserHari(iso, jumlahHari) {
  const [y, m, d] = iso.split('-').map(Number)
  return todayISOString(new Date(y, m - 1, d + jumlahHari))
}

function buatDaftarTanggal(start, end) {
  if (!start || !end || start > end) return []

  const batasAkhir = geserHari(start, MAKS_HARI_RENTANG - 1)
  const akhir = end > batasAkhir ? batasAkhir : end

  const hasil = []
  let kursor = start
  while (kursor <= akhir) {
    hasil.push(kursor)
    kursor = geserHari(kursor, 1)
  }
  return hasil
}

function buatJudulRentang(start, end) {
  if (!start || !end) return 'Statistik'

  const [sy, sm] = start.split('-').map(Number)
  const [ey, em] = end.split('-').map(Number)

  if (sy === ey && sm === em) {
    const tahunIni = new Date().getFullYear()
    return `Bulan ${NAMA_BULAN[sm - 1]}${sy !== tahunIni ? ` ${sy}` : ''}`
  }

  return `${formatTanggal(start)} – ${formatTanggal(end)}`
}

function awalBulanIni() {
  const d = new Date()
  return todayISOString(new Date(d.getFullYear(), d.getMonth(), 1))
}

function akhirBulanIni() {
  const d = new Date()
  return todayISOString(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

function loadDashboardSettings() {
  const defaults = {
    stokKritisGudang: 5,
    stokKritisDisplay: 3,
    kadaluarsaBulan: 3,
    kadaluarsaMendesakHari: 30,
  }

  try {
    const saved = localStorage.getItem('inventaris_settings')
    if (!saved) return defaults
    return { ...defaults, ...JSON.parse(saved) }
  } catch {
    return defaults
  }
}

const JUMLAH_GARIS = 4
const TINGGI_KECIL = 110
const TINGGI_BESAR = 300

function hitungSkala(maxData) {
  if (maxData <= 0) return { step: 1, max: JUMLAH_GARIS }

  const mentah = maxData / JUMLAH_GARIS
  const magnitudo = 10 ** Math.floor(Math.log10(mentah))
  const norm = mentah / magnitudo
  const rapi = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  const step = Math.max(1, Math.ceil(rapi * magnitudo))

  return { step, max: step * JUMLAH_GARIS }
}

function Batang({ nilai, max, tinggi, warna, nama, tampilAngka, lebar }) {
  const px =
    nilai > 0 && max > 0
      ? Math.max(3, Math.round((nilai / max) * tinggi))
      : 0

  return (
    <div
      className={`relative ${lebar}`}
      style={{ height: tinggi }}
      aria-label={`${nama}: ${nilai}`}
    >
      {nilai > 0 && (
        <>
          {tampilAngka && (
            <span
              className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold leading-none text-slate-600"
              style={{ bottom: px + 2 }}
            >
              {nilai}
            </span>
          )}
          <div
            className={`absolute bottom-0 w-full rounded-t ${warna}`}
            style={{ height: px }}
          />
        </>
      )}
    </div>
  )
}

function StatistikChart({ data, satuan, besar = false }) {
  const tinggi = besar ? TINGGI_BESAR : TINGGI_KECIL
  const maxData = Math.max(0, ...data.flatMap((d) => [d.gudang, d.display]))
  const { step, max } = hitungSkala(maxData)
  const garis = Array.from({ length: JUMLAH_GARIS + 1 }, (_, i) => i * step)
  const tampilAngka = besar || data.length <= 16
  const lebar = besar ? 'w-2.5 sm:w-3.5' : 'w-1.5 sm:w-2'

  return (
    <div className="mt-3 min-w-0">
      <p className="mb-1 pl-1 text-[10px] text-slate-400">Jumlah ({satuan})</p>

      <div className="flex min-w-0">
        <div
          className="relative w-8 shrink-0"
          style={{ height: tinggi }}
          aria-hidden="true"
        >
          {garis.map((nilai, i) => (
            <span
              key={nilai}
              className="absolute right-1.5 translate-y-1/2 text-[9px] leading-none text-slate-400"
              style={{ bottom: (i / JUMLAH_GARIS) * tinggi }}
            >
              {nilai}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height: tinggi }}>
            {garis.map((nilai, i) => (
              <div
                key={nilai}
                className={`absolute left-0 right-0 border-t border-dashed ${
                  i === 0 ? 'border-slate-300' : 'border-slate-200'
                }`}
                style={{ bottom: (i / JUMLAH_GARIS) * tinggi }}
              />
            ))}

            <div
              className="absolute inset-x-0 bottom-0 flex"
              style={{ height: tinggi }}
            >
              {data.map((d) => (
                <div
                  key={d.tanggal}
                  title={`${formatTanggal(d.tanggal)} — Masuk gudang: ${d.gudang} ${satuan}, Ke display: ${d.display} ${satuan}`}
                  className="flex min-w-0 flex-1 items-end justify-center gap-px"
                  style={{ height: tinggi }}
                >
                  <Batang
                    nilai={d.gudang}
                    max={max}
                    tinggi={tinggi}
                    lebar={lebar}
                    warna="bg-violet-400"
                    nama="Masuk gudang"
                    tampilAngka={tampilAngka}
                  />
                  <Batang
                    nilai={d.display}
                    max={max}
                    tinggi={tinggi}
                    lebar={lebar}
                    warna="bg-pink-400"
                    nama="Ke display"
                    tampilAngka={tampilAngka}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-1 flex">
            {data.map((d) => (
              <p
                key={d.tanggal}
                className="min-w-0 flex-1 text-center text-[9px] text-slate-500"
              >
                {Number(d.tanggal.slice(8, 10))}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusCount({ count, type = 'danger' }) {
  let className =
    type === 'neutral'
      ? 'bg-slate-50 text-slate-500 border border-slate-200'
      : 'bg-emerald-50 text-emerald-600 border border-emerald-100'

  if (count > 0) {
    className =
      type === 'warning'
        ? 'bg-amber-50 text-amber-600 border border-amber-100'
        : type === 'neutral'
          ? 'bg-slate-50 text-slate-600 border border-slate-200'
          : 'bg-rose-50 text-rose-600 border border-rose-100'
  }

  return (
    <span
      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${className}`}
    >
      {count} {type === 'neutral' ? 'aktivitas' : 'barang'}
    </span>
  )
}

function PanelDaftar({
  icon: Icon,
  title,
  count,
  type = 'danger',
  amanIcon: AmanIcon,
  amanJudul,
  amanKeterangan,
  children,
}) {
  const aman = count === 0
  const warnaIcon = aman
    ? 'text-emerald-500'
    : type === 'warning'
      ? 'text-amber-500'
      : type === 'neutral'
        ? 'text-slate-500'
        : 'text-rose-500'

  return (
    <section
      aria-label={title}
      className="flex h-[26rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-4 py-3">
        <Icon size={17} className={`shrink-0 ${warnaIcon}`} />
        <h2 className="text-sm font-semibold leading-tight text-slate-700">
          {title}
        </h2>
        <div className="ml-auto">
          <StatusCount count={count} type={type} />
        </div>
      </header>

      {aman ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500">
            <AmanIcon size={20} />
          </div>
          <p className="text-xs font-semibold text-emerald-600">{amanJudul}</p>
          <p className="text-[11px] text-slate-400">{amanKeterangan}</p>
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
          {children}
        </ul>
      )}
    </section>
  )
}

function BarisBarang({
  item,
  onClick,
  detail,
  nilai,
  keteranganNilai,
  warnaNilai,
  label,
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#EDEAFF] focus:outline-none focus-visible:bg-[#EDEAFF]"
      >
        <ProductImage item={item} size="lg" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-700">
            {item.nama}
          </p>
          <div className="mt-0.5 text-[11px] text-slate-400">{detail}</div>
        </div>

        <div className="shrink-0 text-right">
          <p className={`text-sm font-bold ${warnaNilai}`}>{nilai}</p>
          <p className="text-[10px] text-slate-400">{keteranganNilai}</p>
        </div>

        <ChevronRight size={15} className="shrink-0 text-slate-300" />
      </button>
    </li>
  )
}

export default function DashboardPage({ barang = [], riwayat = [] }) {
  const navigate = useNavigate()
  const settings = useMemo(() => loadDashboardSettings(), [])

  const [startDate, setStartDate] = useState(awalBulanIni)
  const [endDate, setEndDate] = useState(akhirBulanIni)

  const [selectedSku, setSelectedSku] = useState('')
  const [grafikBesar, setGrafikBesar] = useState(false)

  function handleStartChange(value) {
    if (!value) return
    setStartDate(value)

    if (endDate < value) {
      setEndDate(value)
    } else if (endDate > geserHari(value, MAKS_HARI_RENTANG - 1)) {
      setEndDate(geserHari(value, MAKS_HARI_RENTANG - 1))
    }
  }

  function handleEndChange(value) {
    if (!value) return
    setEndDate(value)

    if (startDate > value) {
      setStartDate(value)
    } else if (startDate < geserHari(value, -(MAKS_HARI_RENTANG - 1))) {
      setStartDate(geserHari(value, -(MAKS_HARI_RENTANG - 1)))
    }
  }

  const selectedProduct = useMemo(
    () => (selectedSku ? barang.find((b) => b.sku === selectedSku) : null),
    [barang, selectedSku]
  )

  const modeSku = selectedSku === ''
  const satuanStatistik = modeSku ? 'SKU' : 'pcs'

  const { statistik, totalGudang, totalDisplay } = useMemo(() => {
    const perTanggal = new Map(
      buatDaftarTanggal(startDate, endDate).map((tanggal) => [
        tanggal,
        {
          tanggal,
          gudang: 0,
          display: 0,
          skuGudang: new Set(),
          skuDisplay: new Set(),
        },
      ])
    )

    const skuGudangRentang = new Set()
    const skuDisplayRentang = new Set()
    let pcsGudang = 0
    let pcsDisplay = 0

    riwayat.forEach((entry) => {
      if (selectedSku && entry.sku !== selectedSku) return

      const bucket = perTanggal.get(tanggalTransaksi(entry))
      if (!bucket) return

      if (entry.jenis === 'masuk') {
        bucket.skuGudang.add(entry.sku)
        skuGudangRentang.add(entry.sku)
        bucket.pcsGudang = (bucket.pcsGudang ?? 0) + getJumlah(entry)
        pcsGudang += getJumlah(entry)
      }

      if (entry.jenis === 'pergerakan') {
        bucket.skuDisplay.add(entry.sku)
        skuDisplayRentang.add(entry.sku)
        bucket.pcsDisplay = (bucket.pcsDisplay ?? 0) + getJumlah(entry)
        pcsDisplay += getJumlah(entry)
      }
    })

    const data = [...perTanggal.values()].map((b) => ({
      tanggal: b.tanggal,
      gudang: modeSku ? b.skuGudang.size : (b.pcsGudang ?? 0),
      display: modeSku ? b.skuDisplay.size : (b.pcsDisplay ?? 0),
    }))

    return {
      statistik: data,
      totalGudang: modeSku ? skuGudangRentang.size : pcsGudang,
      totalDisplay: modeSku ? skuDisplayRentang.size : pcsDisplay,
    }
  }, [riwayat, startDate, endDate, selectedSku, modeSku])

  const stokKritisGudang = useMemo(() => {
    const batas = Number(settings.stokKritisGudang ?? 5)
    return barang
      .filter(
        (item) => Number(item.stokGudang ?? item.stok_gudang ?? 0) <= batas
      )
      .sort(
        (a, b) =>
          Number(a.stokGudang ?? 0) - Number(b.stokGudang ?? 0)
      )
  }, [barang, settings.stokKritisGudang])

  const stokKritisDisplay = useMemo(() => {
    const batas = Number(settings.stokKritisDisplay ?? 3)
    return barang
      .filter(
        (item) => Number(item.stokDisplay ?? item.stok_display ?? 0) <= batas
      )
      .sort(
        (a, b) =>
          Number(a.stokDisplay ?? 0) - Number(b.stokDisplay ?? 0)
      )
  }, [barang, settings.stokKritisDisplay])

  const kedaluwarsa = useMemo(() => {
    const batasHari = Number(settings.kadaluarsaBulan ?? 3) * 30
    const hasil = []

    barang.forEach((item) => {
      getKloterList(item).forEach((kloter) => {
        if (!kloter.tanggalKadaluarsa) return
        if (kloter.stokGudang + kloter.stokDisplay <= 0) return

        const sisa = sisaHari(kloter.tanggalKadaluarsa)
        if (sisa !== null && sisa <= batasHari) {
          hasil.push({ item, kloter, sisa })
        }
      })
    })

    return hasil.sort((a, b) => a.sisa - b.sisa)
  }, [barang, settings.kadaluarsaBulan])

  const activityFeed = useMemo(
    () => sortRiwayatTerbaru(riwayat).slice(0, MAKS_AKTIVITAS),
    [riwayat]
  )

  const keCatatBarang = (item) =>
    navigate('/barang-masuk', { state: { barangId: item.id } })

  const kePergerakan = (item) =>
    navigate('/pergerakan', { state: { barangId: item.id } })

  const keStokBarang = (item, kloter) =>
    navigate('/stok', { state: { barangId: item.id, kloterId: kloter.id } })

  const keRiwayatPerputaran = (jenis) =>
    navigate('/riwayat', {
      state: {
        dariDashboard: true,
        jenis,
        tanggalMulai: startDate,
        tanggalAkhir: endDate,
        sku: selectedSku,
      },
    })

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Ringkasan kondisi inventaris gudang hari ini.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[190px_minmax(0,1fr)]">
        <section
          aria-label="Total jenis barang"
          className="self-start rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <h2 className="text-xs font-semibold text-slate-700">
            Total Jenis Barang
          </h2>
          <div className="mt-3 flex items-end justify-between">
            <p className="text-3xl font-bold text-slate-800">
              {barang.length}
              <span className="ml-1.5 text-xs font-semibold text-slate-400">
                SKU
              </span>
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
              <Package size={18} />
            </div>
          </div>
        </section>

        <section
          aria-label="Statistik perputaran barang"
          className="min-w-0 rounded-xl border border-violet-100 bg-violet-100/70 p-3 shadow-sm"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
            <h2 className="text-base font-bold text-slate-800">
              {buatJudulRentang(startDate, endDate)}
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <CalendarDays size={15} className="text-slate-500" />
              <label htmlFor="tgl-dari" className="sr-only">
                Dari tanggal
              </label>
              <input
                id="tgl-dari"
                type="date"
                value={startDate}
                min={geserHari(endDate, -(MAKS_HARI_RENTANG - 1))}
                max={endDate}
                onChange={(e) => handleStartChange(e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#8A7CD9]"
              />
              <span className="text-[11px] text-slate-500">s/d</span>
              <label htmlFor="tgl-sampai" className="sr-only">
                Sampai tanggal
              </label>
              <input
                id="tgl-sampai"
                type="date"
                value={endDate}
                min={startDate}
                max={geserHari(startDate, MAKS_HARI_RENTANG - 1)}
                onChange={(e) => handleEndChange(e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#8A7CD9]"
              />
              <span className="text-[10px] text-slate-400">Maks. 1 bulan</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[230px_minmax(0,1fr)]">
            <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSku('')}
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                    selectedSku === ''
                      ? 'border-2 border-violet-400 bg-white text-violet-700'
                      : 'border border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  Perputaran
                </button>

                <SkuSearch
                  barang={barang}
                  selectedSku={selectedSku}
                  onSelect={setSelectedSku}
                />
              </div>

              {selectedProduct && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-violet-100 bg-[#EDEAFF] p-2">
                  <ProductImage item={selectedProduct} size="sm" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-700">
                      {selectedProduct.nama}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {selectedProduct.sku}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedSku('')}
                    aria-label="Tampilkan semua SKU"
                    className="rounded-md p-1 text-slate-400 hover:bg-white/70 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => keRiwayatPerputaran('masuk')}
                aria-label="Lihat riwayat aktivitas perputaran barang gudang"
                className="mt-2 flex w-full items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-left transition-colors hover:border-violet-200 hover:bg-[#EDEAFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A7CD9]"
              >
                <div>
                  <p className="text-[11px] text-slate-500">
                    Perputaran Barang Gudang
                  </p>
                  <p className="text-xl font-bold text-slate-800">
                    {totalGudang}
                    <span className="ml-1 text-[10px] font-semibold text-slate-400">
                      {satuanStatistik}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <Warehouse size={16} />
                  </div>
                  <ChevronRight size={15} className="text-slate-300" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => keRiwayatPerputaran('pergerakan')}
                aria-label="Lihat riwayat aktivitas perputaran barang display"
                className="mt-2 flex w-full items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-left transition-colors hover:border-pink-200 hover:bg-[#EDEAFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A7CD9]"
              >
                <div>
                  <p className="text-[11px] text-slate-500">
                    Perputaran Barang Display
                  </p>
                  <p className="text-xl font-bold text-slate-800">
                    {totalDisplay}
                    <span className="ml-1 text-[10px] font-semibold text-slate-400">
                      {satuanStatistik}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
                    <Store size={16} />
                  </div>
                  <ChevronRight size={15} className="text-slate-300" />
                </div>
              </button>
            </div>

            <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">
                    Statistik Perputaran Barang
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {modeSku
                      ? 'Jumlah SKU yang beraktivitas per hari'
                      : `Jumlah pcs ${selectedProduct?.nama ?? 'SKU terpilih'} per hari`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
                    Masuk Gudang
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-pink-400" />
                    Ke Display
                  </span>

                  <button
                    type="button"
                    onClick={() => setGrafikBesar((v) => !v)}
                    aria-pressed={grafikBesar}
                    aria-label={
                      grafikBesar ? 'Kecilkan grafik' : 'Perbesar grafik'
                    }
                    title={grafikBesar ? 'Kecilkan grafik' : 'Perbesar grafik'}
                    className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600 transition hover:bg-[#EDEAFF] hover:text-[#5B528D]"
                  >
                    {grafikBesar ? (
                      <Minimize2 size={12} />
                    ) : (
                      <Maximize2 size={12} />
                    )}
                    {grafikBesar ? 'Kecilkan' : 'Perbesar'}
                  </button>
                </div>
              </div>

              {statistik.length > 0 ? (
                <StatistikChart
                  data={statistik}
                  satuan={satuanStatistik}
                  besar={grafikBesar}
                />
              ) : (
                <p
                  className="flex items-center justify-center text-xs text-slate-400"
                  style={{ height: grafikBesar ? TINGGI_BESAR : TINGGI_KECIL }}
                >
                  Rentang tanggal tidak valid.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PanelDaftar
          icon={AlertTriangle}
          title="Stok Kritis Barang Gudang"
          count={stokKritisGudang.length}
          amanIcon={Package}
          amanJudul="Stok gudang aman"
          amanKeterangan="Tidak ada barang yang hampir habis di gudang."
        >
          {stokKritisGudang.map((item) => {
            const stok = Number(item.stokGudang ?? 0)
            return (
              <BarisBarang
                key={item.id ?? item.sku}
                item={item}
                label={`Catat barang masuk untuk ${item.nama}`}
                onClick={() => keCatatBarang(item)}
                detail={`SKU: ${item.sku}`}
                nilai={stok === 0 ? 'Habis' : stok}
                keteranganNilai={`Min. ${settings.stokKritisGudang}`}
                warnaNilai="text-rose-500"
              />
            )
          })}
        </PanelDaftar>

        <PanelDaftar
          icon={AlertTriangle}
          title="Stok Kritis Barang Display"
          count={stokKritisDisplay.length}
          amanIcon={Store}
          amanJudul="Stok display aman"
          amanKeterangan="Tidak ada stok display yang kritis."
        >
          {stokKritisDisplay.map((item) => {
            const stok = Number(item.stokDisplay ?? 0)
            return (
              <BarisBarang
                key={item.id ?? item.sku}
                item={item}
                label={`Pindahkan ${item.nama} ke display`}
                onClick={() => kePergerakan(item)}
                detail={`SKU: ${item.sku} • Gudang ${Number(item.stokGudang ?? 0)}`}
                nilai={stok === 0 ? 'Habis' : stok}
                keteranganNilai={`Min. ${settings.stokKritisDisplay}`}
                warnaNilai="text-rose-500"
              />
            )
          })}
        </PanelDaftar>

        <PanelDaftar
          icon={Clock}
          title="Stok Barang Mendekati Kedaluwarsa"
          count={kedaluwarsa.length}
          type="warning"
          amanIcon={Clock}
          amanJudul="Aman"
          amanKeterangan="Tidak ada barang yang mendekati kedaluwarsa."
        >
          {kedaluwarsa.map(({ item, kloter, sisa }) => (
            <BarisBarang
              key={`${item.id ?? item.sku}-${kloter.id}`}
              item={item}
              label={`Kelola Kloter ${kloter.nomor} ${item.nama} di Stok Barang`}
              onClick={() => keStokBarang(item, kloter)}
              detail={
                <>
                  <span className="mr-1.5 inline-block rounded-full bg-[#EDEAFF] px-2 py-0.5 text-[10px] font-semibold text-[#5B528D]">
                    Kloter {kloter.nomor}
                  </span>
                  <span>
                    Gudang {kloter.stokGudang}, Display {kloter.stokDisplay}
                  </span>
                  <br />
                  <span>
                    SKU: {item.sku} • Exp.{' '}
                    {formatTanggal(kloter.tanggalKadaluarsa)}
                  </span>
                </>
              }
              nilai={sisa <= 0 ? 'Lewat' : sisa}
              keteranganNilai={sisa <= 0 ? 'kedaluwarsa' : 'hari lagi'}
              warnaNilai={sisa <= 0 ? 'text-rose-500' : 'text-amber-500'}
            />
          ))}
        </PanelDaftar>

        <PanelDaftar
          icon={ClipboardCheck}
          title="Aktivitas Terbaru"
          count={activityFeed.length}
          type="neutral"
          amanIcon={ClipboardCheck}
          amanJudul="Belum ada aktivitas."
          amanKeterangan="Aktivitas akan muncul setelah ada pencatatan."
        >
          {activityFeed.map((log) => {
            const meta = activityIcon[log.jenis] || activityIcon.masuk
            const Icon = meta.icon

            return (
              <li key={log.id}>
                <button
                  type="button"
                  onClick={() => navigate('/riwayat')}
                  aria-label="Buka Riwayat Aktivitas"
                  className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-[#EDEAFF] focus:outline-none focus-visible:bg-[#EDEAFF]"
                >
                  <div
                    className={`h-fit shrink-0 rounded-full p-1.5 ${meta.className}`}
                  >
                    <Icon size={13} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs leading-snug text-slate-700">
                      {log.nama}: {log.keterangan}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {log.oleh} • {formatTanggal(log.tanggal)} {log.waktu}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </PanelDaftar>
      </div>
    </div>
  )
}
