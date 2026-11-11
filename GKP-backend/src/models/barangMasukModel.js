const pool = require('../config/db')
const { escapeLike } = require('../utils/helpers')

async function create(conn, { idKloter, jumlah, tanggalMasuk, lokasiRak, catatan, idUser }) {
  const [result] = await conn.query(
    `INSERT INTO log_barang_masuk (id_kloter, jumlah, tanggal_masuk, lokasi_rak, catatan, id_user)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [idKloter, jumlah, tanggalMasuk, lokasiRak, catatan, idUser]
  )
  return result.insertId
}

// Membangun klausa WHERE dari filter (semua nilai lewat placeholder ?).
function buildFilter({ idBarang, idKloter, dari, sampai, search }) {
  const where = []
  const params = []
  if (idBarang) {
    where.push('k.id_barang = ?')
    params.push(idBarang)
  }
  if (idKloter) {
    where.push('m.id_kloter = ?')
    params.push(idKloter)
  }
  if (dari) {
    where.push('m.tanggal_masuk >= ?')
    params.push(dari)
  }
  if (sampai) {
    where.push('m.tanggal_masuk <= ?')
    params.push(sampai)
  }
  if (search) {
    const like = `%${escapeLike(search)}%`
    where.push('(b.sku LIKE ? OR b.nama_barang LIKE ? OR k.nama_kloter LIKE ?)')
    params.push(like, like, like)
  }
  return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', params }
}

const FROM_JOIN = `
  FROM log_barang_masuk m
  JOIN kloter_stok k ON k.id_kloter = m.id_kloter
  JOIN barang b      ON b.id_barang = k.id_barang
  JOIN users u       ON u.id_user   = m.id_user`

// Riwayat barang masuk dengan pagination server-side.
// Log tetap ditampilkan walau barang/kloternya sudah di-soft-delete (jejak audit).
async function findAll(filters, { limit, offset }, db = pool) {
  const { clause, params } = buildFilter(filters)

  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total ${FROM_JOIN} ${clause}`, params)

  const [rows] = await db.query(
    `SELECT m.id_masuk, m.id_kloter, k.nama_kloter, k.tanggal_kedaluwarsa,
            b.id_barang, b.sku, b.nama_barang,
            m.jumlah, m.tanggal_masuk, m.lokasi_rak, m.catatan,
            m.id_user, u.nama AS nama_user, m.created_at
     ${FROM_JOIN}
     ${clause}
     ORDER BY m.tanggal_masuk DESC, m.id_masuk DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  return { items: rows, totalItems: Number(total) }
}

module.exports = { create, findAll }
