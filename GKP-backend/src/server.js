const app = require('./app')
const pool = require('./config/db')

const PORT = Number(process.env.PORT || 5000)

async function start() {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET belum diset. Salin .env.example menjadi .env terlebih dahulu.')
    process.exit(1)
  }
  await pool.query('SELECT 1') // pastikan koneksi MySQL berhasil
  app.listen(PORT, () => console.log(`SIGKP API berjalan di http://localhost:${PORT}/api`))
}

start().catch((err) => {
  console.error('Gagal start server:', err.message)
  process.exit(1)
})
