// MENGHAPUS lalu membuat ulang database dari schema.sql (khusus development).
// Dipakai saat schema.sql berubah, karena schema memakai CREATE TABLE IF NOT EXISTS
// sehingga tabel lama tidak otomatis ikut ter-update.
// Pemakaian: npm run db:reset -- --yes
require('dotenv').config()
const { execFileSync } = require('child_process')
const path = require('path')
const mysql = require('mysql2/promise')

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Ditolak: db:reset tidak boleh dijalankan di production.')
    process.exit(1)
  }
  if (!process.argv.includes('--yes')) {
    console.error('PERINGATAN: perintah ini MENGHAPUS SELURUH DATA database.')
    console.error('Jalankan ulang dengan konfirmasi: npm run db:reset -- --yes')
    process.exit(1)
  }

  const dbName = process.env.DB_NAME || 'sigkp'
  if (!/^[A-Za-z0-9_]+$/.test(dbName)) {
    console.error('DB_NAME hanya boleh berisi huruf, angka, dan underscore.')
    process.exit(1)
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  })
  await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``)
  await conn.end()
  console.log(`Database "${dbName}" dihapus.`)

  execFileSync(process.execPath, [path.join(__dirname, 'init.js')], { stdio: 'inherit' })
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
