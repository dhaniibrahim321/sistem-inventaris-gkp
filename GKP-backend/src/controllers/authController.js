const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const AppError = require('../utils/AppError')
const userModel = require('../models/userModel')
const { sendSuccess } = require('../utils/response')
const { asyncHandler, requireString } = require('../utils/helpers')

const DUMMY_HASH = bcrypt.hashSync('dummy-password-penyeimbang-waktu', 10)

function requirePassword(value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new AppError('Password wajib diisi.', 400)
  }
  if (Buffer.byteLength(value, 'utf8') > 72) {
    throw new AppError('Password maksimal 72 karakter.', 400)
  }
  return value
}

exports.login = asyncHandler(async (req, res) => {
  const body = req.body ?? {}
  const username = requireString(body.username, 'Username', { max: 50, sanitize: false })
  const password = requirePassword(body.password)

  const user = await userModel.findActiveByUsername(username)
  const passwordValid = await bcrypt.compare(password, user ? user.password : DUMMY_HASH)

  if (!user || !passwordValid) {
    throw new AppError('Username atau password salah.', 401)
  }

  const profile = {
    id_user: user.id_user,
    username: user.username,
    nama: user.nama,
    role: user.role,
  }
  const expiresIn = process.env.JWT_EXPIRES_IN || '8h'
  const token = jwt.sign(profile, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn,
    subject: String(user.id_user),
  })

  return sendSuccess(res, {
    message: 'Login berhasil.',
    data: { token, token_type: 'Bearer', expires_in: expiresIn, user: profile },
  })
})

exports.me = (req, res) =>
  sendSuccess(res, { message: 'Data pengguna berhasil diambil.', data: { user: req.user } })
