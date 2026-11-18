const router = require('express').Router()
const { authenticate } = require('../middleware/auth')
const c = require('../controllers/opnameController')

router.use(authenticate)

// Urutan penting: rute statis harus sebelum "/:id".
router.get('/form', c.daftarForm)    // data untuk form opname (barang + kloter + stok sistem)
router.get('/laporan', c.laporan)    // laporan opname per tanggal
router.get('/', c.daftar)            // riwayat opname (filter tanggal/status/search)
router.post('/', c.simpan)           // simpan hasil opname (batch, atomik)
router.get('/:id', c.detail)

module.exports = router
