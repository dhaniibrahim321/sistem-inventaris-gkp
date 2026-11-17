// Error yang "diharapkan" (validasi, data tidak ditemukan, dsb).
// Pesannya aman ditampilkan ke pengguna. `details` (opsional) dikirim di field data.
class AppError extends Error {
  constructor(message, status = 400, details = null) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.details = details
  }
}

module.exports = AppError
