const pool = require('../config/db')

// Catatan tim: CRUD master barang adalah modul "Kelola Data Barang".
// File ini baru berisi query baca yang dibutuhkan modul Barang Masuk &
// Pergerakan. Silakan tambahkan fungsi CRUD di file ini (jangan buat file baru).

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

// Mengunci baris barang (SELECT ... FOR UPDATE) selama transaksi berjalan,
// supaya penomoran "Kloter N" untuk barang yang sama tidak bentrok saat
// dua admin mencatat barang masuk bersamaan. WAJIB dipanggil dengan connection.
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
