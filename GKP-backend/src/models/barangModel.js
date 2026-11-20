const pool = require('../config/db')

async function findActiveById(idBarang, db = pool) {
  const [rows] = await db.query(
    `SELECT id_barang, sku, nama_barang, kategori
     FROM barang
     WHERE id_barang = ? AND is_deleted = 0
     LIMIT 1`,
    [idBarang]
  )
  return rows[0] || null
}

async function lockActiveById(conn, idBarang) {
  const [rows] = await conn.query(
    `SELECT id_barang, sku, nama_barang
     FROM barang
     WHERE id_barang = ? AND is_deleted = 0
     FOR UPDATE`,
    [idBarang]
  )
  return rows[0] || null
}

module.exports = { findActiveById, lockActiveById }
