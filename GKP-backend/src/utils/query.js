// Helper parsing query string (pagination, angka opsional, LIKE) — dipakai modul Nawaf.
const AppError = require('./AppError')

// Baca integer opsional dari query string. Kosong -> fallback.
function optionalInt(value, label, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined || value === null || value === '') return fallback
  const n = Number(value)
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new AppError(`${label} harus bilangan bulat antara ${min} dan ${max}.`, 400)
  }
  return n
}

// Baca integer dari ENV, jika tidak valid pakai fallback.
function envInt(name, fallback) {
  const n = Number(process.env[name])
  return Number.isInteger(n) && n >= 0 ? n : fallback
}

function parsePagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = optionalInt(query.page, 'page', 1, { min: 1 })
  const limit = optionalInt(query.limit, 'limit', defaultLimit, { min: 1, max: maxLimit })
  return { page, limit, offset: (page - 1) * limit }
}

// Escape karakter spesial LIKE agar input user "%" / "_" dianggap teks biasa.
function likeTerm(value) {
  const s = String(value ?? '').trim().replace(/[\\%_]/g, '\\$&')
  return `%${s}%`
}

function paginationMeta({ page, limit }, total) {
  return { page, limit, total, total_halaman: Math.max(1, Math.ceil(total / limit)) }
}

module.exports = { optionalInt, envInt, parsePagination, likeTerm, paginationMeta }
