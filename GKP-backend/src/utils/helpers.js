const AppError = require('./AppError')
const pool = require('../config/db')

// ---------------------------------------------------------------------
// Async & transaksi
// ---------------------------------------------------------------------

// Membungkus handler async agar error otomatis diteruskan ke errorHandler.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

// Menjalankan callback di dalam satu transaksi (BEGIN -> COMMIT / ROLLBACK).
// Jika ROLLBACK gagal (mis. koneksi putus), koneksi dihancurkan agar tidak
// dikembalikan ke pool dalam keadaan transaksi menggantung.
async function withTransaction(callback) {
  const conn = await pool.getConnection()
  let reusable = true
  try {
    await conn.beginTransaction()
    const result = await callback(conn)
    await conn.commit()
    return result
  } catch (err) {
    try {
      await conn.rollback()
    } catch {
      reusable = false
    }
    throw err
  } finally {
    if (reusable) conn.release()
    else conn.destroy()
  }
}

// ---------------------------------------------------------------------
// Validasi input (semua fungsi melempar AppError 400 jika tidak valid)
// ---------------------------------------------------------------------

const MAX_INT = 2147483647
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Hanya menerima number bulat atau string berisi digit murni.
// Menolak: "", " ", "1e3", "0x10", "5.5", true, [], {}, null.
function parseIntStrict(value) {
  if (typeof value === 'number') return Number.isSafeInteger(value) ? value : NaN
  if (typeof value === 'string' && /^\s*-?\d+\s*$/.test(value)) {
    const n = Number(value.trim())
    return Number.isSafeInteger(n) ? n : NaN
  }
  return NaN
}

function requirePositiveInt(value, label, { max = MAX_INT } = {}) {
  const n = parseIntStrict(value)
  if (Number.isNaN(n) || n <= 0) {
    throw new AppError(`${label} harus berupa bilangan bulat lebih dari 0.`, 400)
  }
  if (n > max) {
    throw new AppError(`${label} maksimal ${max}.`, 400)
  }
  return n
}

function requireNonNegativeInt(value, label, { max = MAX_INT } = {}) {
  const n = parseIntStrict(value)
  if (Number.isNaN(n) || n < 0) {
    throw new AppError(`${label} harus berupa bilangan bulat 0 atau lebih.`, 400)
  }
  if (n > max) {
    throw new AppError(`${label} maksimal ${max}.`, 400)
  }
  return n
}

function optionalPositiveInt(value, label, opts) {
  if (value === undefined || value === null || value === '') return null
  return requirePositiveInt(value, label, opts)
}

// Validasi tanggal kalender sungguhan (menolak 2026-02-31, 2026-13-01, dst).
function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  )
}

function requireDate(value, label) {
  if (!isValidDate(value)) {
    throw new AppError(`${label} wajib diisi dengan format YYYY-MM-DD yang valid.`, 400)
  }
  return value
}

function optionalDate(value, label) {
  if (value === undefined || value === null || value === '') return null
  return requireDate(value, label)
}

// Sanitasi ringan: membuang < dan > agar teks tidak bisa membawa tag HTML.
const stripTags = (s) => s.replace(/[<>]/g, '')

function requireString(value, label, { max = 255, sanitize = true } = {}) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(`${label} wajib diisi.`, 400)
  }
  const s = (sanitize ? stripTags(value) : value).trim()
  if (!s) throw new AppError(`${label} wajib diisi.`, 400)
  if (s.length > max) throw new AppError(`${label} maksimal ${max} karakter.`, 400)
  return s
}

function optionalString(value, label = 'Input', { max = 255, sanitize = true } = {}) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new AppError(`Format ${label} tidak valid.`, 400)
  }
  const raw = String(value)
  const s = (sanitize ? stripTags(raw) : raw).trim()
  if (s === '') return null
  if (s.length > max) throw new AppError(`${label} maksimal ${max} karakter.`, 400)
  return s
}

function optionalBoolean(value) {
  if (value === undefined || value === null || value === '') return false
  return ['1', 'true', 'ya', 'yes'].includes(String(value).toLowerCase())
}

// Escape karakter wildcard LIKE (% dan _) agar pencarian literal.
const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&')

// Tanggal "hari ini" menurut zona waktu bisnis (default Asia/Jakarta),
// bukan zona waktu server (server cloud biasanya UTC).
function todayInAppTimezone() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.APP_TIMEZONE || 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function maxJumlahTransaksi() {
  const n = Number(process.env.MAX_JUMLAH_TRANSAKSI)
  return Number.isSafeInteger(n) && n > 0 ? Math.min(n, MAX_INT) : 1000000
}

// ---------------------------------------------------------------------
// Pagination server-side
// ---------------------------------------------------------------------

function parsePagination(query = {}, { defaultLimit = 10, maxLimit = 100 } = {}) {
  const page = query.page === undefined || query.page === '' ? 1 : parseIntStrict(query.page)
  if (Number.isNaN(page) || page < 1) {
    throw new AppError('Parameter page harus bilangan bulat mulai dari 1.', 400)
  }

  let limit =
    query.limit === undefined || query.limit === '' ? defaultLimit : parseIntStrict(query.limit)
  if (Number.isNaN(limit) || limit < 1) {
    throw new AppError('Parameter limit harus bilangan bulat mulai dari 1.', 400)
  }
  limit = Math.min(limit, maxLimit)

  return { page, limit, offset: (page - 1) * limit }
}

function buildPagination({ page, limit, totalItems }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit))
  return {
    page,
    limit,
    total_items: totalItems,
    total_pages: totalPages,
    has_next: page < totalPages,
    has_prev: page > 1,
  }
}

module.exports = {
  asyncHandler,
  withTransaction,
  parseIntStrict,
  requirePositiveInt,
  requireNonNegativeInt,
  optionalPositiveInt,
  isValidDate,
  requireDate,
  optionalDate,
  requireString,
  optionalString,
  optionalBoolean,
  escapeLike,
  todayInAppTimezone,
  maxJumlahTransaksi,
  parsePagination,
  buildPagination,
}
