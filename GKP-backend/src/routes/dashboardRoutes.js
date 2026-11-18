const router = require('express').Router()
const { authenticate } = require('../middleware/auth')
const c = require('../controllers/dashboardController')

router.use(authenticate)

router.get('/ringkasan', c.ringkasan)       // total SKU, total stok, jumlah kritis & kedaluwarsa
router.get('/statistik', c.statistik)       // grafik masuk gudang vs ke display per hari
router.get('/stok-kritis', c.stokKritis)    // daftar barang stok kritis (gudang & display)
router.get('/kedaluwarsa', c.kedaluwarsa)   // kloter mendekati kedaluwarsa
router.get('/aktivitas', c.aktivitas)       // aktivitas terbaru

module.exports = router
