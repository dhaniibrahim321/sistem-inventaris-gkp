const router = require('express').Router()
const fs = require('fs')
const path = require('path')
const { sendSuccess } = require('../utils/response')

// Health Check
router.get('/health', (req, res) => sendSuccess(res, { message: 'SIGKP API berjalan.' }))

// Registrasi modul rute secara otomatis jika file rute ada
const routes = [
  { prefix: '/auth', file: './authRoutes.js' },
  { prefix: '/barang-masuk', file: './barangMasukRoutes.js' },
  { prefix: '/pergerakan', file: './pergerakanRoutes.js' },
  { prefix: '/kloter', file: './kloterRoutes.js' },
]

for (const r of routes) {
  if (fs.existsSync(path.join(__dirname, r.file))) {
    router.use(r.prefix, require(r.file))
  }
}

module.exports = router

