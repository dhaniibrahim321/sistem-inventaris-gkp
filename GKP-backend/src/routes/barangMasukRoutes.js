const router = require('express').Router()
const authenticate = require('../middleware/auth')
const barangMasuk = require('../controllers/barangMasukController')

router.use(authenticate)

router.get('/', barangMasuk.listBarangMasuk)
router.post('/', barangMasuk.createBarangMasuk)

module.exports = router
