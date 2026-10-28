const AppError = require('./AppError')
const pool = require('../config/db')

// Membungkus handler async agar error otomatis diteruskan ke errorHandler.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

// Menjalankan callback di dalam satu transaksi (commit / rollback otomatis).
async function withTransaction(callback) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const result = await callback(conn)
    await conn.commit()
    return result
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function requireDate(value, label) {
  if (!value || !DATE_RE.test(String(value)) || Number.isNaN(Date.parse(value))) {
    throw new AppError(`${label} wajib diisi dengan format YYYY-MM-DD.`, 400)
  }
  return String(value)
}

function requirePositiveInt(value, label) {
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppError(`${label} harus berupa bilangan bulat lebih dari 0.`, 400)
  }
  return n
}

function requireNonNegativeInt(value, label) {
  const n = Number(value)
  if (value === '' || value === null || value === undefined || !Number.isInteger(n) || n < 0) {
    throw new AppError(`${label} harus berupa bilangan bulat 0 atau lebih.`, 400)
  }
  return n
}

function requireString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(`${label} wajib diisi.`, 400)
  }
  // Sanitasi: hilangkan karakter < dan > untuk mencegah injeksi script/XSS
  return value.replace(/[<>]/g, '').trim()
}

function optionalString(value) {
  if (value === undefined || value === null) return null
  // Sanitasi: hilangkan karakter < dan > untuk mencegah injeksi script/XSS
  const s = String(value).replace(/[<>]/g, '').trim()
  return s === '' ? null : s
}

module.exports = {
  asyncHandler,
  withTransaction,
  requireDate,
  requirePositiveInt,
  requireNonNegativeInt,
  requireString,
  optionalString,
}
