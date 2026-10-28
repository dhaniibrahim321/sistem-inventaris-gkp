// Membuat akun Admin Gudang awal. Pemakaian: npm run db:seed-admin
require('dotenv').config()
const bcrypt = require('bcryptjs')
const pool = require('../src/config/db')

async function main() {
  const username = process.env.ADMIN_USERNAME
  const password = process.env.ADMIN_PASSWORD
  const nama = process.env.ADMIN_NAMA || 'Admin Gudang'

  if (!username || !password) {
    console.error('Error: ADMIN_USERNAME dan ADMIN_PASSWORD wajib diatur di dalam file .env!')
    process.exit(1)
  }

  const [rows] = await pool.query('SELECT id_user FROM users WHERE username = ?', [username])
  if (rows.length > 0) {
    console.log(`User "${username}" sudah ada di database.`)
  } else {
    const hash = await bcrypt.hash(password, 10)
    await pool.query(
      "INSERT INTO users (username, password, role, nama) VALUES (?, ?, 'admin_gudang', ?)",
      [username, hash, nama]
    )
    console.log(`User "${username}" berhasil dibuat ke database.`)
  }
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
