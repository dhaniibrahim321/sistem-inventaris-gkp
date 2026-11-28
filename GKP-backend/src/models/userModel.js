const pool = require('../config/db')

async function findByUsername(username, db = pool) {
  const [rows] = await db.query(
    `SELECT id_user, username, password, nama, role, status, is_deleted
     FROM users
     WHERE username = ?
     LIMIT 1`,
    [username]
  )
  return rows[0] || null
}

async function findActiveByUsername(username, db = pool) {
  const [rows] = await db.query(
    `SELECT id_user, username, password, nama, role, status
     FROM users
     WHERE username = ? AND is_deleted = 0 AND status = 'aktif'
     LIMIT 1`,
    [username]
  )
  return rows[0] || null
}

async function findActiveById(idUser, db = pool) {
  const [rows] = await db.query(
    `SELECT id_user, username, nama, role, status
     FROM users
     WHERE id_user = ? AND is_deleted = 0 AND status = 'aktif'
     LIMIT 1`,
    [idUser]
  )
  return rows[0] || null
}

async function findById(idUser, db = pool) {
  const [rows] = await db.query(
    `SELECT id_user, username, nama, role, status, is_deleted, created_at
     FROM users
     WHERE id_user = ?
     LIMIT 1`,
    [idUser]
  )
  return rows[0] || null
}

async function createPendingStaff({ username, passwordHash, nama }, db = pool) {
  const [result] = await db.query(
    `INSERT INTO users (username, password, role, status, nama)
     VALUES (?, ?, 'staf_gudang', 'pending', ?)`,
    [username, passwordHash, nama]
  )
  return result.insertId
}

async function findStaffList(db = pool) {
  const [rows] = await db.query(
    `SELECT id_user, username, nama, role, status, is_deleted, created_at, updated_at
     FROM users
     WHERE role <> 'super_admin'
     ORDER BY FIELD(status, 'pending', 'aktif', 'nonaktif', 'ditolak'), created_at DESC`
  )
  return rows
}

async function countPendingStaff(db = pool) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM users
     WHERE role <> 'super_admin' AND status = 'pending' AND is_deleted = 0`
  )
  return Number(row?.total || 0)
}

async function updateStatus(idUser, { status, isDeleted }, db = pool) {
  const [result] = await db.query(
    `UPDATE users
     SET status = ?, is_deleted = ?
     WHERE id_user = ?`,
    [status, isDeleted, idUser]
  )
  return result.affectedRows
}

module.exports = {
  findByUsername,
  findActiveByUsername,
  findActiveById,
  findById,
  createPendingStaff,
  findStaffList,
  countPendingStaff,
  updateStatus,
}
