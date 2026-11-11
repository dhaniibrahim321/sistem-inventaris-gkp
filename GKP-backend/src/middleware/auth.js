const jwt = require('jsonwebtoken')
const AppError = require('../utils/AppError')
const userModel = require('../models/userModel')

// Verifikasi token Bearer JWT + memastikan akun pemilik token masih aktif
// (akun yang di-soft-delete langsung kehilangan akses walau tokennya belum expired).
// Data user terbaru dari database disimpan di req.user.
module.exports = async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const [scheme, token] = header.split(' ')
    if (scheme !== 'Bearer' || !token) {
      throw new AppError('Token autentikasi tidak ditemukan.', 401)
    }

    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
    } catch (err) {
      const message =
        err.name === 'TokenExpiredError'
          ? 'Sesi login sudah berakhir. Silakan login kembali.'
          : 'Token autentikasi tidak valid.'
      throw new AppError(message, 401)
    }

    const user = await userModel.findActiveById(decoded.id_user)
    if (!user) {
      throw new AppError('Akun tidak ditemukan atau sudah dinonaktifkan.', 401)
    }

    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}

// Kompatibilitas ganda:
// Bisa di-import via `const authenticate = require('./auth')`
// ATAU via `const { authenticate } = require('./auth')` (dipakai oleh modul Nawaf/tim)
module.exports.authenticate = module.exports
