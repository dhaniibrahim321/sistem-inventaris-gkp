const AppError = require('../utils/AppError')
const { asyncHandler, requireDate, requirePositiveInt, requireNonNegativeInt } = require('../utils/helpers')
const { parsePagination, likeTerm, paginationMeta } = require('../utils/query')
const stokModel = require('../models/stokModel')
const model = require('../models/opnameModel')

const MAKS_ITEM = 1000
const STATUS_VALID = ['sesuai', 'kurang', 'lebih']

// Daftar barang + kloter + stok sistem untuk form opname.
const daftarForm = asyncHandler(async (req, res) => {
  const search = String(req.query.search ?? '').trim()
  const { data } = await stokModel.daftar({
    search, kategori: '', status: '', batas: 0,
    likeSearch: likeTerm(search), limit: MAKS_ITEM, offset: 0,
  })
  res.json({ success: true, data })
})

// Simpan hasil opname. Body:
// { "tanggal_opname": "2026-11-03", "items": [{ "id_kloter": 1, "stok_fisik": 12 }, ...] }
const simpan = asyncHandler(async (req, res) => {
  const tanggal = requireDate(req.body.tanggal_opname, 'Tanggal opname')
  const items = req.body.items
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('items wajib berisi minimal satu kloter yang diopname.', 400)
  }
  if (items.length > MAKS_ITEM) throw new AppError(`items maksimal ${MAKS_ITEM} kloter per proses.`, 400)

  const dilihat = new Set()
  const bersih = items.map((it, i) => {
    const idKloter = requirePositiveInt(it?.id_kloter, `items[${i}].id_kloter`)
    const fisik = requireNonNegativeInt(it?.stok_fisik, `items[${i}].stok_fisik`)
    if (dilihat.has(idKloter)) throw new AppError(`Kloter ${idKloter} muncul lebih dari sekali.`, 400)
    dilihat.add(idKloter)
    return { id_kloter: idKloter, stok_fisik: fisik }
  })

  const data = await model.simpan({ tanggal, items: bersih, idUser: req.user.id_user })
  const { sesuai, kurang, lebih, total } = data.ringkasan
  res.status(201).json({
    success: true,
    message: `Hasil opname ${total} kloter disimpan: ${sesuai} sesuai, ${kurang} kurang, ${lebih} lebih.`,
    data,
  })
})

const daftar = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query)
  const mulai = req.query.tanggal_mulai ? requireDate(req.query.tanggal_mulai, 'tanggal_mulai') : null
  const akhir = req.query.tanggal_akhir ? requireDate(req.query.tanggal_akhir, 'tanggal_akhir') : null
  if (mulai && akhir && mulai > akhir) throw new AppError('tanggal_mulai tidak boleh setelah tanggal_akhir.', 400)
  const status = req.query.status ? String(req.query.status).toLowerCase() : ''
  if (status && !STATUS_VALID.includes(status)) {
    throw new AppError(`status harus salah satu dari: ${STATUS_VALID.join(', ')}.`, 400)
  }
  const search = String(req.query.search ?? '').trim()

  const { data, total } = await model.daftar({
    mulai, akhir, status, search, likeSearch: likeTerm(search), limit: pg.limit, offset: pg.offset,
  })
  res.json({ success: true, data, meta: paginationMeta(pg, total) })
})

const laporan = asyncHandler(async (req, res) => {
  const tanggal = requireDate(req.query.tanggal, 'tanggal')
  res.json({ success: true, data: await model.laporan(tanggal) })
})

const detail = asyncHandler(async (req, res) => {
  const id = requirePositiveInt(req.params.id, 'id_opname')
  res.json({ success: true, data: await model.detail(id) })
})

module.exports = { daftarForm, simpan, daftar, laporan, detail }
