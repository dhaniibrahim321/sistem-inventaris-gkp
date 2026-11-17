const { sendError } = require('../utils/response')

function notFound(req, res) {
  sendError(res, {
    statusCode: 404,
    message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`,
  })
}

// Pemetaan error database (MySQL & MariaDB/XAMPP) ke pesan yang aman.
const DB_ERRORS = {
  ER_DUP_ENTRY: [409, 'Data duplikat: nilai unik sudah digunakan.'],
  ER_ROW_IS_REFERENCED_2: [409, 'Data tidak dapat dihapus karena masih dipakai data lain.'],
  ER_NO_REFERENCED_ROW_2: [400, 'Referensi data tidak ditemukan.'],
  ER_CHECK_CONSTRAINT_VIOLATED: [400, 'Data melanggar aturan validasi database.'], // MySQL 8
  ER_CONSTRAINT_FAILED: [400, 'Data melanggar aturan validasi database.'], // MariaDB
  ER_DATA_OUT_OF_RANGE: [400, 'Nilai angka di luar batas yang diizinkan (stok tidak boleh negatif).'],
  ER_WARN_DATA_OUT_OF_RANGE: [400, 'Nilai angka di luar batas yang diizinkan.'],
  ER_DATA_TOO_LONG: [400, 'Teks yang dikirim melebihi panjang maksimal.'],
  ER_LOCK_WAIT_TIMEOUT: [503, 'Data sedang diproses transaksi lain. Silakan coba lagi.'],
  ER_LOCK_DEADLOCK: [503, 'Data sedang diproses transaksi lain. Silakan coba lagi.'],
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = 500
  let message = 'Terjadi kesalahan pada server.'
  let data = null

  if (err.name === 'AppError') {
    statusCode = err.status
    message = err.message
    data = err.details ?? null
  } else if (err.code && DB_ERRORS[err.code]) {
    ;[statusCode, message] = DB_ERRORS[err.code]
  } else if (err.type === 'entity.too.large') {
    statusCode = 413
    message = 'Ukuran data terlalu besar.'
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400
    message = 'Body JSON tidak valid.'
  }

  // Error tak terduga: detail hanya dicatat di log server, TIDAK dikirim ke klien
  // (mencegah kebocoran struktur SQL / stack trace).
  if (statusCode >= 500) {
    console.error(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ->`,
      err
    )
  }

  sendError(res, { statusCode, message, data })
}

module.exports = { notFound, errorHandler }
