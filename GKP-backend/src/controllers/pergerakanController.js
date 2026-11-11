const pool = require('../config/db')
const AppError = require('../utils/AppError')
const barangModel = require('../models/barangModel')
const kloterModel = require('../models/kloterModel')
const pergerakanModel = require('../models/pergerakanModel')
const { sendSuccess } = require('../utils/response')
const {
  asyncHandler,
  requirePositiveInt,
  optionalPositiveInt,
  requireDate,
  optionalDate,
  requireString,
  optionalString,
  optionalBoolean,
  todayInAppTimezone,
  maxJumlahTransaksi,
  parsePagination,
  buildPagination,
} = require('../utils/helpers')

// ---------------------------------------------------------------------
// GET /api/kloter/:id_barang?hanya_tersedia=1
// Daftar kloter aktif milik satu barang (urut FIFO) untuk dropdown UI.
// ---------------------------------------------------------------------
exports.getKloterByBarang = asyncHandler(async (req, res) => {
  const idBarang = requirePositiveInt(req.params.id_barang, 'id_barang')
  const hanyaTersedia = optionalBoolean(req.query.hanya_tersedia)

  const barang = await barangModel.findActiveById(idBarang)
  if (!barang) {
    throw new AppError('Barang tidak ditemukan atau sudah dihapus.', 404)
  }

  const items = await kloterModel.findActiveByBarang(idBarang, { hanyaTersedia })

  return sendSuccess(res, {
    message: 'Daftar kloter berhasil diambil.',
    data: { barang, items },
  })
})

// ---------------------------------------------------------------------
// POST /api/pergerakan
// Body: { id_kloter, jumlah_pindah, tanggal_pindah, letak_rak, catatan? }
// Memindahkan stok gudang -> display dalam SATU transaksi atomik.
// ---------------------------------------------------------------------
exports.createPergerakan = asyncHandler(async (req, res) => {
  const body = req.body ?? {}

  // 1. Validasi input
  const idKloter = requirePositiveInt(body.id_kloter, 'id_kloter')
  const jumlahPindah = requirePositiveInt(body.jumlah_pindah, 'Jumlah pindah', {
    max: maxJumlahTransaksi(),
  })
  const tanggalPindah = requireDate(body.tanggal_pindah, 'Tanggal pindah')
  const letakRak = requireString(body.letak_rak, 'Letak rak display', { max: 100 })
  const catatan = optionalString(body.catatan, 'Catatan', { max: 1000 })

  if (tanggalPindah > todayInAppTimezone()) {
    throw new AppError('Tanggal pindah tidak boleh melebihi tanggal hari ini.', 400)
  }

  // 2. Transaksi atomik
  const conn = await pool.getConnection()
  let reusable = true
  let result

  try {
    await conn.beginTransaction()

    // Kunci baris kloter: transaksi lain yang ingin memindahkan stok kloter
    // yang sama harus menunggu sampai transaksi ini COMMIT / ROLLBACK.
    const kloter = await kloterModel.lockActiveWithBarang(conn, idKloter)
    if (!kloter) {
      throw new AppError('Kloter tidak ditemukan atau sudah dihapus.', 404)
    }
    if (kloter.tanggal_masuk && tanggalPindah < kloter.tanggal_masuk) {
      throw new AppError(
        `Tanggal pindah tidak boleh sebelum tanggal masuk ${kloter.nama_kloter} (${kloter.tanggal_masuk}).`,
        400
      )
    }
    if (kloter.tanggal_kedaluwarsa < tanggalPindah) {
      throw new AppError(
        `${kloter.nama_kloter} sudah kedaluwarsa (${kloter.tanggal_kedaluwarsa}) dan tidak boleh dipindahkan ke display.`,
        400
      )
    }
    if (kloter.stok_gudang < jumlahPindah) {
      throw new AppError(
        `Stok gudang ${kloter.nama_kloter} tidak mencukupi (tersedia ${kloter.stok_gudang}).`,
        400
      )
    }

    const affected = await kloterModel.moveGudangToDisplay(conn, idKloter, jumlahPindah)
    if (affected !== 1) {
      throw new AppError('Stok kloter berubah saat diproses. Silakan muat ulang lalu coba lagi.', 409)
    }

    const idPergerakan = await pergerakanModel.create(conn, {
      idKloter,
      jumlahPindah,
      tanggalPindah,
      letakRak,
      catatan,
      idUser: req.user.id_user,
    })

    await conn.commit()

    result = {
      id_pergerakan: idPergerakan,
      id_kloter: idKloter,
      nama_kloter: kloter.nama_kloter,
      id_barang: kloter.id_barang,
      sku: kloter.sku,
      nama_barang: kloter.nama_barang,
      jumlah_pindah: jumlahPindah,
      tanggal_pindah: tanggalPindah,
      letak_rak: letakRak,
      catatan,
      stok_sebelum: { gudang: kloter.stok_gudang, display: kloter.stok_display },
      stok_sesudah: {
        gudang: kloter.stok_gudang - jumlahPindah,
        display: kloter.stok_display + jumlahPindah,
      },
    }
  } catch (err) {
    try {
      await conn.rollback()
    } catch {
      reusable = false // koneksi rusak: jangan dikembalikan ke pool
    }
    throw err
  } finally {
    if (reusable) conn.release()
    else conn.destroy()
  }

  return sendSuccess(res, {
    statusCode: 201,
    message: `${result.jumlah_pindah} ${result.nama_barang} (${result.nama_kloter}) berhasil dipindahkan ke display.`,
    data: result,
  })
})

// ---------------------------------------------------------------------
// GET /api/pergerakan?page=1&limit=10&id_barang=&id_kloter=&dari=&sampai=&search=
// Riwayat pergerakan gudang -> display dengan pagination server-side.
// ---------------------------------------------------------------------
exports.listPergerakan = asyncHandler(async (req, res) => {
  const q = req.query
  const { page, limit, offset } = parsePagination(q)

  const filters = {
    idBarang: optionalPositiveInt(q.id_barang, 'id_barang'),
    idKloter: optionalPositiveInt(q.id_kloter, 'id_kloter'),
    dari: optionalDate(q.dari, 'Tanggal dari'),
    sampai: optionalDate(q.sampai, 'Tanggal sampai'),
    search: optionalString(q.search, 'Kata kunci', { max: 100 }),
  }
  if (filters.dari && filters.sampai && filters.dari > filters.sampai) {
    throw new AppError('Tanggal "dari" tidak boleh melebihi tanggal "sampai".', 400)
  }

  const { items, totalItems } = await pergerakanModel.findAll(filters, { limit, offset })

  return sendSuccess(res, {
    message: 'Riwayat pergerakan barang berhasil diambil.',
    data: { items, pagination: buildPagination({ page, limit, totalItems }) },
  })
})
