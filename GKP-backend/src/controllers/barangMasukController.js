const pool = require('../config/db')
const AppError = require('../utils/AppError')
const barangModel = require('../models/barangModel')
const kloterModel = require('../models/kloterModel')
const barangMasukModel = require('../models/barangMasukModel')
const { sendSuccess } = require('../utils/response')
const {
  asyncHandler,
  requirePositiveInt,
  optionalPositiveInt,
  requireDate,
  optionalDate,
  optionalString,
  todayInAppTimezone,
  maxJumlahTransaksi,
  parsePagination,
  buildPagination,
} = require('../utils/helpers')

// ---------------------------------------------------------------------
// POST /api/barang-masuk
// Body: { id_barang, jumlah, tanggal_masuk, tanggal_kedaluwarsa,
//         nama_kloter?, lokasi_rak?, catatan? }
// Membuat kloter baru (stok_gudang = jumlah, stok_display = 0) + log masuk
// dalam SATU transaksi atomik.
// ---------------------------------------------------------------------
exports.createBarangMasuk = asyncHandler(async (req, res) => {
  const body = req.body ?? {}

  // 1. Validasi input
  const idBarang = requirePositiveInt(body.id_barang, 'id_barang')
  const jumlah = requirePositiveInt(body.jumlah, 'Jumlah barang masuk', {
    max: maxJumlahTransaksi(),
  })
  const tanggalMasuk = requireDate(body.tanggal_masuk, 'Tanggal masuk')
  const tanggalKedaluwarsa = requireDate(body.tanggal_kedaluwarsa, 'Tanggal kedaluwarsa')
  const lokasiRak = optionalString(body.lokasi_rak, 'Lokasi rak', { max: 100 })
  const catatan = optionalString(body.catatan, 'Catatan', { max: 1000 })
  let namaKloter = optionalString(body.nama_kloter, 'Nama kloter', { max: 50 })

  const today = todayInAppTimezone()
  if (tanggalMasuk > today) {
    throw new AppError('Tanggal masuk tidak boleh melebihi tanggal hari ini.', 400)
  }
  if (tanggalKedaluwarsa <= tanggalMasuk) {
    throw new AppError('Tanggal kedaluwarsa harus setelah tanggal masuk.', 400)
  }
  if (tanggalKedaluwarsa < today) {
    throw new AppError('Barang yang sudah kedaluwarsa tidak dapat dicatat sebagai barang masuk.', 400)
  }

  // 2. Transaksi atomik
  const conn = await pool.getConnection()
  let reusable = true
  let result

  try {
    await conn.beginTransaction()

    // Kunci baris barang -> penomoran kloter aman dari race condition.
    const barang = await barangModel.lockActiveById(conn, idBarang)
    if (!barang) {
      throw new AppError('Barang tidak ditemukan atau sudah dihapus.', 404)
    }

    if (!namaKloter) {
      namaKloter = `Kloter ${await kloterModel.getNextNomor(conn, idBarang)}`
    }

    const idKloter = await kloterModel.create(conn, {
      idBarang,
      namaKloter,
      tanggalKedaluwarsa,
      stokGudang: jumlah,
    })

    const idMasuk = await barangMasukModel.create(conn, {
      idKloter,
      jumlah,
      tanggalMasuk,
      lokasiRak,
      catatan,
      idUser: req.user.id_user,
    })

    await conn.commit()

    result = {
      id_masuk: idMasuk,
      id_kloter: idKloter,
      id_barang: barang.id_barang,
      sku: barang.sku,
      nama_barang: barang.nama_barang,
      nama_kloter: namaKloter,
      jumlah,
      tanggal_masuk: tanggalMasuk,
      tanggal_kedaluwarsa: tanggalKedaluwarsa,
      lokasi_rak: lokasiRak,
      catatan,
      stok_gudang: jumlah,
      stok_display: 0,
    }
  } catch (err) {
    try {
      await conn.rollback()
    } catch {
      reusable = false // koneksi rusak: jangan dikembalikan ke pool
    }
    if (err.code === 'ER_DUP_ENTRY') {
      throw new AppError(`Nama kloter "${namaKloter}" sudah dipakai untuk barang ini.`, 409)
    }
    throw err
  } finally {
    if (reusable) conn.release()
    else conn.destroy()
  }

  return sendSuccess(res, {
    statusCode: 201,
    message: `${result.jumlah} ${result.nama_barang} berhasil dicatat sebagai ${result.nama_kloter}.`,
    data: result,
  })
})

// ---------------------------------------------------------------------
// GET /api/barang-masuk?page=1&limit=10&id_barang=&id_kloter=&dari=&sampai=&search=
// Riwayat barang masuk dengan pagination server-side.
// ---------------------------------------------------------------------
exports.listBarangMasuk = asyncHandler(async (req, res) => {
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

  const { items, totalItems } = await barangMasukModel.findAll(filters, { limit, offset })

  return sendSuccess(res, {
    message: 'Riwayat barang masuk berhasil diambil.',
    data: { items, pagination: buildPagination({ page, limit, totalItems }) },
  })
})
