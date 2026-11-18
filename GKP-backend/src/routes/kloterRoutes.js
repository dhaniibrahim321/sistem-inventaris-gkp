const router = require('express').Router()
const authenticate = require('../middleware/auth')
const pergerakan = require('../controllers/pergerakanController')

router.use(authenticate)

router.get('/:id_barang', pergerakan.getKloterByBarang)

module.exports = router
