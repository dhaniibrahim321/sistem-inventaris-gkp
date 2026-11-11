const router = require('express').Router()
const authenticate = require('../middleware/auth')
const pergerakan = require('../controllers/pergerakanController')

router.use(authenticate)

// Dropdown kloter pada form Pergerakan Barang
router.get('/:id_barang', pergerakan.getKloterByBarang)

module.exports = router
