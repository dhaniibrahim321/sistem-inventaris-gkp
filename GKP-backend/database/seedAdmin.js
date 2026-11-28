require('dotenv').config()
const bcrypt = require('bcryptjs')
const pool = require('../src/config/db')

async function main() {
  const username = process.env.ADMIN_USERNAME
  const password = process.env.ADMIN_PASSWORD
  const nama = process.env.ADMIN_NAMA || 'Super Admin'

  if (!username || !password) {
    console.error('Error: ADMIN_USERNAME dan ADMIN_PASSWORD wajib diatur di dalam file .env!')
    process.exit(1)
  }

  const [rows] = await pool.query('SELECT id_user FROM users WHERE username = ?', [username])
  if (rows.length > 0) {
    await pool.query(
      "UPDATE users SET role = 'super_admin', status = 'aktif', is_deleted = 0 WHERE id_user = ?",
      [rows[0].id_user]
    )
    console.log(`User "${username}" diperbarui menjadi super_admin aktif.`)
  } else {
    const hash = await bcrypt.hash(password, 10)
    await pool.query(
      "INSERT INTO users (username, password, role, status, nama) VALUES (?, ?, 'super_admin', 'aktif', ?)",
      [username, hash, nama]
    )
    console.log(`User "${username}" (super_admin) berhasil dibuat ke database.`)
  }
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
