const pool = require('../config/db')

// Parameter `db` bisa berupa pool (query biasa) atau connection (di dalam transaksi).

// Dipakai saat login: menyertakan hash password untuk diverifikasi bcrypt.
async function findActiveByUsername(username, db = pool) {
  const [rows] = await db.query(
    `SELECT id_user, username, password, nama, role
     FROM users
     WHERE username = ? AND is_deleted = 0
     LIMIT 1`,
    [username]
  )
  return rows[0] || null
}

// Dipakai middleware auth: memastikan akun pemilik token masih aktif.
async function findActiveById(idUser, db = pool) {
  const [rows] = await db.query(
    `SELECT id_user, username, nama, role
     FROM users
     WHERE id_user = ? AND is_deleted = 0
     LIMIT 1`,
    [idUser]
  )
  return rows[0] || null
}

module.exports = { findActiveByUsername, findActiveById }
