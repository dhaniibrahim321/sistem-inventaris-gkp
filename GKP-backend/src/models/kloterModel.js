const pool = require('../config/db')

// Daftar kloter aktif milik satu barang, urut FIFO (kedaluwarsa terdekat dulu).
async function findActiveByBarang(idBarang, { hanyaTersedia = false } = {}, db = pool) {
  const [rows] = await db.query(
    `SELECT id_kloter, id_barang, nama_kloter, tanggal_kedaluwarsa,
            stok_gudang, stok_display, (stok_gudang + stok_display) AS total
     FROM kloter_stok
     WHERE id_barang = ? AND is_deleted = 0
       ${hanyaTersedia ? 'AND stok_gudang > 0' : ''}
     ORDER BY tanggal_kedaluwarsa ASC, id_kloter ASC`,
    [idBarang]
  )
  return rows
}

// Nomor kloter berikutnya = nomor tertinggi + 1. Kloter yang sudah di-soft-delete
// ikut dihitung agar nama baru tidak bentrok dengan UNIQUE (id_barang, nama_kloter).
// Panggil setelah baris barang dikunci (barangModel.lockActiveById).
async function getNextNomor(conn, idBarang) {
  const [rows] = await conn.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(nama_kloter, ' ', -1) AS UNSIGNED)), 0) AS maks
     FROM kloter_stok
     WHERE id_barang = ?`,
    [idBarang]
  )
  return Number(rows[0].maks) + 1
}

// Kloter baru dari barang masuk: seluruh jumlah berada di gudang.
async function create(conn, { idBarang, namaKloter, tanggalKedaluwarsa, stokGudang }) {
  const [result] = await conn.query(
    `INSERT INTO kloter_stok (id_barang, nama_kloter, tanggal_kedaluwarsa, stok_gudang, stok_display)
     VALUES (?, ?, ?, ?, 0)`,
    [idBarang, namaKloter, tanggalKedaluwarsa, stokGudang]
  )
  return result.insertId
}

// Mengunci baris kloter (FOR UPDATE) beserta info barang & tanggal masuknya.
// Kloter / barang yang sudah di-soft-delete dianggap tidak ada.
async function lockActiveWithBarang(conn, idKloter) {
  const [rows] = await conn.query(
    `SELECT k.id_kloter, k.id_barang, k.nama_kloter, k.tanggal_kedaluwarsa,
            k.stok_gudang, k.stok_display,
            b.sku, b.nama_barang,
            (SELECT m.tanggal_masuk FROM log_barang_masuk m
              WHERE m.id_kloter = k.id_kloter LIMIT 1) AS tanggal_masuk
     FROM kloter_stok k
     JOIN barang b ON b.id_barang = k.id_barang
     WHERE k.id_kloter = ? AND k.is_deleted = 0 AND b.is_deleted = 0
     FOR UPDATE`,
    [idKloter]
  )
  return rows[0] || null
}

// Memindahkan stok gudang -> display secara atomik.
// Kondisi `stok_gudang >= ?` adalah pengaman kedua (selain pengecekan di
// controller): jika stok tidak cukup, tidak ada baris yang ter-update.
async function moveGudangToDisplay(conn, idKloter, jumlah) {
  const [result] = await conn.query(
    `UPDATE kloter_stok
     SET stok_gudang = stok_gudang - ?, stok_display = stok_display + ?
     WHERE id_kloter = ? AND is_deleted = 0 AND stok_gudang >= ?`,
    [jumlah, jumlah, idKloter, jumlah]
  )
  return result.affectedRows
}

module.exports = {
  findActiveByBarang,
  getNextNomor,
  create,
  lockActiveWithBarang,
  moveGudangToDisplay,
}
