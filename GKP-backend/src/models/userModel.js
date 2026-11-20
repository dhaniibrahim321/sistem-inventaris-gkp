const pool = require('../config/db')

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
