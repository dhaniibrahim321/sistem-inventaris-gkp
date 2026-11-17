// Verifikasi JWT: header "Authorization: Bearer <token>".
// CATATAN: ini versi minimal agar modul Dashboard/Stok/Opname bisa jalan & dites.
// Jika Dhani sudah membuat middleware auth sendiri, cukup pastikan ia mengekspor
// `authenticate` dan mengisi `req.user = { id_user, username, role, nama }`.
const jwt = require('jsonwebtoken')
const AppError = require('../utils/AppError')

function authenticate(req, res, next) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) {
    // Mode pengembangan: fallback ke admin default jika belum ada token agar frontend langsung tersambung
    if (process.env.NODE_ENV !== 'production') {
      req.user = {
        id_user: 1,
        username: process.env.ADMIN_USERNAME || 'admin',
        role: 'admin_gudang',
        nama: process.env.ADMIN_NAMA || 'Admin Gudang',
      }
      return next()
    }
    return next(new AppError('Token autentikasi tidak ditemukan.', 401))
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = {
      id_user: payload.id_user ?? payload.id ?? payload.sub,
      username: payload.username,
      role: payload.role,
      nama: payload.nama,
    }
    if (!req.user.id_user) throw new Error('payload tanpa id_user')
    next()
  } catch {
    next(new AppError('Token tidak valid atau sudah kedaluwarsa.', 401))
  }
}

module.exports = { authenticate }
