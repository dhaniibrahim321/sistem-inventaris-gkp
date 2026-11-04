const router = require('express').Router()
const { authenticate } = require('../middleware/auth')
const c = require('../controllers/stokController')

router.use(authenticate)

router.get('/', c.daftar)                                  // daftar stok + pencarian
router.get('/barang/:idBarang', c.detail)                  // detail stok satu barang (+ kloter)
router.put('/kloter/:idKloter', c.sesuaikan)               // penyesuaian manual gudang & display
router.post('/kloter/:idKloter/kurangi-display', c.kurangiDisplay)

module.exports = router
