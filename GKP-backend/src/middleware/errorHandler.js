function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} tidak ditemukan.` })
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || 500
  let message = err.message || 'Terjadi kesalahan pada server.'

  // Pemetaan error MySQL yang umum
  if (err.code === 'ER_DUP_ENTRY') {
    status = 409
    message = 'Data duplikat: nilai unik (mis. SKU atau nama kloter) sudah digunakan.'
  } else if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    status = 409
    message = 'Data tidak dapat dihapus karena sudah dipakai oleh data lain (kloter/riwayat).'
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    status = 400
    message = 'Referensi data tidak ditemukan.'
  } else if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    status = 400
    message = 'Stok tidak boleh bernilai negatif.'
  } else if (err.type === 'entity.too.large') {
    status = 413
    message = 'Ukuran data terlalu besar.'
  } else if (err.type === 'entity.parse.failed') {
    status = 400
    message = 'Body JSON tidak valid.'
  }

  if (status >= 500) console.error(err)

  res.status(status).json({ success: false, message })
}

module.exports = { notFound, errorHandler }
