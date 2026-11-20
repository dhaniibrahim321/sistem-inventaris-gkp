const jwt = require('jsonwebtoken')
const AppError = require('../utils/AppError')
const userModel = require('../models/userModel')

async function authenticate(req, res, next) {
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

function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'super_admin') {
    return next(new AppError('Akses ditolak. Fitur ini khusus Super Admin.', 403))
  }
  next()
}

module.exports = authenticate
module.exports.authenticate = authenticate
module.exports.requireSuperAdmin = requireSuperAdmin
