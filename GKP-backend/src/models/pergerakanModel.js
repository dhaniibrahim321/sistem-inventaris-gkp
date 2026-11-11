const pool = require('../config/db')
const { escapeLike } = require('../utils/helpers')

async function create(conn, { idKloter, jumlahPindah, tanggalPindah, letakRak, catatan, idUser }) {
  const [result] = await conn.query(
    `INSERT INTO log_pergerakan (id_kloter, jumlah_pindah, tanggal_pindah, letak_rak, catatan, id_user)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [idKloter, jumlahPindah, tanggalPindah, letakRak, catatan, idUser]
  )
  return result.insertId
}

function buildFilter({ idBarang, idKloter, dari, sampai, search }) {
  const where = []
  const params = []
  if (idBarang) {
    where.push('k.id_barang = ?')
    params.push(idBarang)
  }
  if (idKloter) {
    where.push('p.id_kloter = ?')
    params.push(idKloter)
  }
  if (dari) {
    where.push('p.tanggal_pindah >= ?')
    params.push(dari)
  }
  if (sampai) {
    where.push('p.tanggal_pindah <= ?')
    params.push(sampai)
  }
  if (search) {
    const like = `%${escapeLike(search)}%`
    where.push('(b.sku LIKE ? OR b.nama_barang LIKE ? OR k.nama_kloter LIKE ? OR p.letak_rak LIKE ?)')
    params.push(like, like, like, like)
  }
  return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', params }
}

const FROM_JOIN = `
  FROM log_pergerakan p
  JOIN kloter_stok k ON k.id_kloter = p.id_kloter
  JOIN barang b      ON b.id_barang = k.id_barang
  JOIN users u       ON u.id_user   = p.id_user`

// Riwayat pergerakan gudang -> display dengan pagination server-side.
async function findAll(filters, { limit, offset }, db = pool) {
  const { clause, params } = buildFilter(filters)

  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total ${FROM_JOIN} ${clause}`, params)

  const [rows] = await db.query(
    `SELECT p.id_pergerakan, p.id_kloter, k.nama_kloter, k.tanggal_kedaluwarsa,
            b.id_barang, b.sku, b.nama_barang,
            p.jumlah_pindah, p.tanggal_pindah, p.letak_rak, p.catatan,
            p.id_user, u.nama AS nama_user, p.created_at
     ${FROM_JOIN}
     ${clause}
     ORDER BY p.tanggal_pindah DESC, p.id_pergerakan DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  return { items: rows, totalItems: Number(total) }
}

module.exports = { create, findAll }
