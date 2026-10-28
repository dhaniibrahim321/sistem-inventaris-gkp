require('dotenv').config()
const mysql = require('mysql2/promise')

// dateStrings: kolom DATE dikembalikan sebagai string "YYYY-MM-DD"
// (bukan objek Date) agar tidak bergeser karena zona waktu.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'Sistem_Inventaris_GKP',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
})

module.exports = pool
