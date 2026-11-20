const { asyncHandler, requirePositiveInt, requireNonNegativeInt, optionalString } = require('../utils/helpers')
const AppError = require('../utils/AppError')
const { optionalInt, envInt, parsePagination, likeTerm, paginationMeta } = require('../utils/query')
const model = require('../models/stokModel')

const STATUS_VALID = ['habis', 'menipis', 'tersedia']

function batasMenipis(q) {
  return optionalInt(q.batas, 'batas', envInt('STOK_KRITIS_LIMIT', 10))
}

const daftar = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { defaultLimit: 20, maxLimit: 1000 })
  const search = String(req.query.search ?? '').trim()
  const kategori = String(req.query.kategori ?? '').trim()
  const status = req.query.status ? String(req.query.status).toLowerCase() : ''
  if (status && !STATUS_VALID.includes(status)) {
    throw new AppError(`status harus salah satu dari: ${STATUS_VALID.join(', ')}.`, 400)
  }

  const { data, total } = await model.daftar({
    search, kategori, status,
    batas: batasMenipis(req.query),
    likeSearch: likeTerm(search),
    limit: pg.limit, offset: pg.offset,
  })
  res.json({ success: true, data, meta: paginationMeta(pg, total) })
})

const detail = asyncHandler(async (req, res) => {
  const id = requirePositiveInt(req.params.idBarang, 'id_barang')
  res.json({ success: true, data: await model.detailBarang(id, batasMenipis(req.query)) })
})

const sesuaikan = asyncHandler(async (req, res) => {
  const id = requirePositiveInt(req.params.idKloter, 'id_kloter')
  const stokGudang = requireNonNegativeInt(req.body.stok_gudang, 'Stok gudang')
  const stokDisplay = requireNonNegativeInt(req.body.stok_display, 'Stok display')
  const data = await model.sesuaikan(id, {
    stokGudang, stokDisplay,
    catatan: optionalString(req.body.catatan),
    idUser: req.user.id_user,
  })
  res.json({ success: true, message: 'Stok kloter berhasil diperbarui.', data })
})

const kurangiDisplay = asyncHandler(async (req, res) => {
  const id = requirePositiveInt(req.params.idKloter, 'id_kloter')
  const jumlah = requirePositiveInt(req.body.jumlah, 'Jumlah yang dikurangi')
  const data = await model.kurangiDisplay(id, {
    jumlah,
    catatan: optionalString(req.body.catatan),
    idUser: req.user.id_user,
  })
  res.json({ success: true, message: 'Stok display berhasil dikurangi.', data })
})

module.exports = { daftar, detail, sesuaikan, kurangiDisplay }
