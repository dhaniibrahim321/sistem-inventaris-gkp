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

exports.createBarangMasuk = asyncHandler(async (req, res) => {
  const body = req.body ?? {}

  const idBarang = requirePositiveInt(body.id_barang, 'id_barang')
  const jumlah = requirePositiveInt(body.jumlah, 'Jumlah barang masuk', {
    max: maxJumlahTransaksi(),
  })
  const tanggalMasuk = requireDate(body.tanggal_masuk, 'Tanggal masuk')
  const lokasiRak = optionalString(body.lokasi_rak, 'Lokasi rak', { max: 100 })
  const catatan = optionalString(body.catatan, 'Catatan', { max: 1000 })
  let namaKloter = optionalString(body.nama_kloter, 'Nama kloter', { max: 50 })
  const idKloterPilihan = optionalPositiveInt(body.id_kloter, 'id_kloter')

  const today = todayInAppTimezone()
  if (tanggalMasuk > today) {
    throw new AppError('Tanggal masuk tidak boleh melebihi tanggal hari ini.', 400)
  }

  const tanggalKedaluwarsa = body.tanggal_kedaluwarsa
    ? requireDate(body.tanggal_kedaluwarsa, 'Tanggal kedaluwarsa')
    : null

  if (!idKloterPilihan) {
    if (!tanggalKedaluwarsa) {
      throw new AppError('Tanggal kedaluwarsa wajib diisi untuk kloter baru.', 400)
    }
    if (tanggalKedaluwarsa <= tanggalMasuk) {
      throw new AppError('Tanggal kedaluwarsa harus setelah tanggal masuk.', 400)
    }
    if (tanggalKedaluwarsa < today) {
      throw new AppError('Barang yang sudah kedaluwarsa tidak dapat dicatat sebagai barang masuk.', 400)
    }
  }

  const conn = await pool.getConnection()
  let reusable = true
  let result

  try {
    await conn.beginTransaction()

    const barang = await barangModel.lockActiveById(conn, idBarang)
    if (!barang) {
      throw new AppError('Barang tidak ditemukan atau sudah dihapus.', 404)
    }

    let idKloterFinal
    let tglExpFinal = tanggalKedaluwarsa
    let stokGudangFinal = jumlah

    if (idKloterPilihan) {
      const [existingKloter] = await conn.query(
        'SELECT * FROM kloter_stok WHERE id_kloter = ? AND id_barang = ? AND is_deleted = 0 FOR UPDATE',
        [idKloterPilihan, idBarang]
      )
      if (existingKloter.length === 0) {
        throw new AppError('Kloter yang dipilih tidak ditemukan pada barang ini.', 404)
      }
      idKloterFinal = idKloterPilihan
      namaKloter = existingKloter[0].nama_kloter
      tglExpFinal = existingKloter[0].tanggal_kedaluwarsa
      stokGudangFinal = Number(existingKloter[0].stok_gudang) + jumlah

      await conn.query(
        'UPDATE kloter_stok SET stok_gudang = stok_gudang + ? WHERE id_kloter = ?',
        [jumlah, idKloterFinal]
      )
    } else {
      if (!namaKloter) {
        namaKloter = `Kloter ${await kloterModel.getNextNomor(conn, idBarang)}`
      }

      idKloterFinal = await kloterModel.create(conn, {
        idBarang,
        namaKloter,
        tanggalKedaluwarsa: tglExpFinal,
        stokGudang: jumlah,
      })
    }

    const idMasuk = await barangMasukModel.create(conn, {
      idKloter: idKloterFinal,
      jumlah,
      tanggalMasuk,
      lokasiRak: lokasiRak || null,
      catatan,
      idUser: req.user.id_user,
    })

    await conn.commit()

    result = {
      id_masuk: idMasuk,
      id_kloter: idKloterFinal,
      id_barang: barang.id_barang,
      sku: barang.sku,
      nama_barang: barang.nama_barang,
      nama_kloter: namaKloter,
      jumlah,
      tanggal_masuk: tanggalMasuk,
      tanggal_kedaluwarsa: tglExpFinal,
      lokasi_rak: lokasiRak,
      catatan,
      stok_gudang: stokGudangFinal,
      stok_display: 0,
    }
  } catch (err) {
    try {
      await conn.rollback()
    } catch {
      reusable = false
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
