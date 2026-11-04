const AppError = require('../utils/AppError')
const { requireDate, asyncHandler } = require('../utils/helpers')
const { optionalInt, envInt } = require('../utils/query')
const model = require('../models/dashboardModel')

const MAKS_HARI_RENTANG = 31 // sama dengan batas grafik di frontend

// Batas default dari .env; bisa di-override lewat query string (dari halaman Pengaturan).
function batasDariQuery(q) {
  const defKritis = envInt('STOK_KRITIS_LIMIT', 10)
  return {
    batasGudang: optionalInt(q.batas_gudang, 'batas_gudang', defKritis),
    batasDisplay: optionalInt(q.batas_display, 'batas_display', defKritis),
    hariKedaluwarsa: optionalInt(q.hari_kedaluwarsa, 'hari_kedaluwarsa', envInt('KEDALUWARSA_HARI', 30), { max: 3650 }),
  }
}

const ringkasan = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await model.ringkasan(batasDariQuery(req.query)) })
})

const stokKritis = asyncHandler(async (req, res) => {
  const { batasGudang, batasDisplay } = batasDariQuery(req.query)
  const limit = optionalInt(req.query.limit, 'limit', 50, { min: 1, max: 200 })
  const data = await model.stokKritis({ batasGudang, batasDisplay, limit })
  res.json({ success: true, batas: { gudang: batasGudang, display: batasDisplay }, data })
})

const kedaluwarsa = asyncHandler(async (req, res) => {
  const { hariKedaluwarsa } = batasDariQuery(req.query)
  const limit = optionalInt(req.query.limit, 'limit', 50, { min: 1, max: 200 })
  const data = await model.kedaluwarsa({ hari: hariKedaluwarsa, limit })
  res.json({ success: true, batas_hari: hariKedaluwarsa, data })
})

function tanggalLokal(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function daftarTanggal(start, end) {
  const hasil = []
  const [y, m, d] = start.split('-').map(Number)
  const kursor = new Date(Date.UTC(y, m - 1, d))
  const akhir = Date.parse(`${end}T00:00:00Z`)
  while (kursor.getTime() <= akhir) {
    hasil.push(kursor.toISOString().slice(0, 10))
    kursor.setUTCDate(kursor.getUTCDate() + 1)
  }
  return hasil
}

const statistik = asyncHandler(async (req, res) => {
  const now = new Date()
  const start = req.query.start
    ? requireDate(req.query.start, 'start')
    : tanggalLokal(new Date(now.getFullYear(), now.getMonth(), 1))
  const end = req.query.end
    ? requireDate(req.query.end, 'end')
    : tanggalLokal(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  const sku = req.query.sku ? String(req.query.sku).trim() : ''

  if (start > end) throw new AppError('Tanggal mulai tidak boleh setelah tanggal akhir.', 400)
  const tanggal = daftarTanggal(start, end)
  if (tanggal.length > MAKS_HARI_RENTANG) {
    throw new AppError(`Rentang tanggal maksimal ${MAKS_HARI_RENTANG} hari.`, 400)
  }

  const { masuk, pindah } = await model.statistik({ start, end, sku })

  const perHari = new Map(tanggal.map((t) => [t, {
    tanggal: t,
    gudang_pcs: 0, display_pcs: 0,
    skuGudang: new Set(), skuDisplay: new Set(),
  }]))
  const skuGudangAll = new Set()
  const skuDisplayAll = new Set()
  let totalGudangPcs = 0
  let totalDisplayPcs = 0

  masuk.forEach((r) => {
    const b = perHari.get(r.tanggal)
    if (!b) return
    b.gudang_pcs += Number(r.pcs)
    b.skuGudang.add(r.id_barang)
    skuGudangAll.add(r.id_barang)
    totalGudangPcs += Number(r.pcs)
  })
  pindah.forEach((r) => {
    const b = perHari.get(r.tanggal)
    if (!b) return
    b.display_pcs += Number(r.pcs)
    b.skuDisplay.add(r.id_barang)
    skuDisplayAll.add(r.id_barang)
    totalDisplayPcs += Number(r.pcs)
  })

  res.json({
    success: true,
    data: {
      start, end, sku: sku || null,
      harian: [...perHari.values()].map((b) => ({
        tanggal: b.tanggal,
        gudang_pcs: b.gudang_pcs,
        display_pcs: b.display_pcs,
        gudang_sku: b.skuGudang.size,
        display_sku: b.skuDisplay.size,
      })),
      total: {
        gudang_pcs: totalGudangPcs,
        display_pcs: totalDisplayPcs,
        gudang_sku: skuGudangAll.size,
        display_sku: skuDisplayAll.size,
      },
    },
  })
})

const aktivitas = asyncHandler(async (req, res) => {
  const limit = optionalInt(req.query.limit, 'limit', 50, { min: 1, max: 200 })
  res.json({ success: true, data: await model.aktivitasTerbaru(limit) })
})

module.exports = { ringkasan, stokKritis, kedaluwarsa, statistik, aktivitas }
