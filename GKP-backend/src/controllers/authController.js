const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const AppError = require('../utils/AppError')
const userModel = require('../models/userModel')
const { sendSuccess } = require('../utils/response')
const { asyncHandler, requireString, requirePositiveInt } = require('../utils/helpers')

const DUMMY_HASH = bcrypt.hashSync('dummy-password-penyeimbang-waktu', 10)
const USERNAME_RE = /^[a-zA-Z0-9._]{3,30}$/

function requirePassword(value, { min = 1 } = {}) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new AppError('Password wajib diisi.', 400)
  }
  if (value.length < min) {
    throw new AppError(`Password minimal ${min} karakter.`, 400)
  }
  if (Buffer.byteLength(value, 'utf8') > 72) {
    throw new AppError('Password maksimal 72 karakter.', 400)
  }
  return value
}

exports.register = asyncHandler(async (req, res) => {
  const body = req.body ?? {}
  const nama = requireString(body.nama, 'Nama lengkap', { max: 100 })
  const username = requireString(body.username, 'Username', { max: 30, sanitize: false })
  if (!USERNAME_RE.test(username)) {
    throw new AppError(
      'Username harus 3–30 karakter dan hanya boleh berisi huruf, angka, titik, atau garis bawah.',
      400
    )
  }
  const password = requirePassword(body.password, { min: 8 })
  if (body.konfirmasi_password !== undefined && body.konfirmasi_password !== password) {
    throw new AppError('Konfirmasi password tidak cocok.', 400)
  }

  const existing = await userModel.findByUsername(username)
  if (existing) {
    throw new AppError('Username sudah digunakan. Silakan pilih username lain.', 409)
  }

  const passwordHash = await bcrypt.hash(password, 10)
  let idUser
  try {
    idUser = await userModel.createPendingStaff({ username, passwordHash, nama })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw new AppError('Username sudah digunakan. Silakan pilih username lain.', 409)
    }
    throw err
  }

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Pendaftaran berhasil. Akun Anda menunggu persetujuan Super Admin.',
    data: {
      id_user: idUser,
      username,
      nama,
      role: 'staf_gudang',
      status: 'pending',
    },
  })
})

exports.login = asyncHandler(async (req, res) => {
  const body = req.body ?? {}
  const username = requireString(body.username, 'Username', { max: 50, sanitize: false })
  const password = requirePassword(body.password)

  const user = await userModel.findByUsername(username)
  const passwordValid = await bcrypt.compare(password, user ? user.password : DUMMY_HASH)

  if (!user || !passwordValid) {
    throw new AppError('Username atau password salah.', 401)
  }

  if (user.status === 'pending') {
    throw new AppError('Akun Anda sedang menunggu persetujuan Super Admin.', 403)
  }
  if (user.status === 'ditolak') {
    throw new AppError('Permohonan pendaftaran akun Anda tidak disetujui.', 403)
  }
  if (user.status === 'nonaktif' || user.is_deleted === 1) {
    throw new AppError('Akun Anda telah dinonaktifkan. Silakan hubungi Super Admin.', 403)
  }
  if (user.status !== 'aktif') {
    throw new AppError('Akun Anda tidak aktif.', 403)
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

exports.listUsers = asyncHandler(async (req, res) => {
  const [items, pendingCount] = await Promise.all([
    userModel.findStaffList(),
    userModel.countPendingStaff(),
  ])

  return sendSuccess(res, {
    message: 'Daftar akun staf berhasil diambil.',
    data: { items, pending_count: pendingCount },
  })
})

exports.pendingCount = asyncHandler(async (req, res) => {
  const pendingCount = await userModel.countPendingStaff()
  return sendSuccess(res, {
    message: 'Jumlah permohonan akun berhasil diambil.',
    data: { pending_count: pendingCount },
  })
})

exports.verifyUser = asyncHandler(async (req, res) => {
  const idUser = requirePositiveInt(req.params.id, 'id_user')
  const action = requireString(req.body?.action, 'Aksi')

  if (action !== 'approve' && action !== 'reject') {
    throw new AppError('Aksi harus bernilai "approve" atau "reject".', 400)
  }

  const target = await userModel.findById(idUser)
  if (!target) {
    throw new AppError('Akun staf tidak ditemukan.', 404)
  }
  if (target.role === 'super_admin') {
    throw new AppError('Akun Super Admin tidak dapat diubah melalui menu ini.', 400)
  }
  if (target.status !== 'pending') {
    throw new AppError('Permohonan akun ini sudah diproses sebelumnya.', 400)
  }

  if (action === 'approve') {
    await userModel.updateStatus(idUser, { status: 'aktif', isDeleted: 0 })
    return sendSuccess(res, {
      message: `Akun "${target.nama}" (${target.username}) berhasil diverifikasi dan diaktifkan.`,
      data: { id_user: idUser, status: 'aktif' },
    })
  }

  await userModel.updateStatus(idUser, { status: 'ditolak', isDeleted: 1 })
  return sendSuccess(res, {
    message: `Permohonan akun "${target.nama}" (${target.username}) ditolak.`,
    data: { id_user: idUser, status: 'ditolak' },
  })
})

exports.deactivateUser = asyncHandler(async (req, res) => {
  const idUser = requirePositiveInt(req.params.id, 'id_user')

  if (idUser === req.user.id_user) {
    throw new AppError('Anda tidak dapat menonaktifkan akun Anda sendiri.', 400)
  }

  const target = await userModel.findById(idUser)
  if (!target) {
    throw new AppError('Akun staf tidak ditemukan.', 404)
  }
  if (target.role === 'super_admin') {
    throw new AppError('Akun Super Admin tidak dapat dinonaktifkan.', 403)
  }
  if (target.status === 'nonaktif' || target.is_deleted === 1) {
    throw new AppError('Akun ini sudah dalam status nonaktif.', 400)
  }
  if (target.status !== 'aktif') {
    throw new AppError('Hanya akun aktif yang dapat dinonaktifkan.', 400)
  }

  await userModel.updateStatus(idUser, { status: 'nonaktif', isDeleted: 1 })
  return sendSuccess(res, {
    message: `Akun staf "${target.nama}" (${target.username}) berhasil dinonaktifkan.`,
    data: { id_user: idUser, status: 'nonaktif' },
  })
})
