const router = require('express').Router()
const authenticate = require('../middleware/auth')
const pergerakan = require('../controllers/pergerakanController')

router.use(authenticate)

router.get('/', pergerakan.listPergerakan)
router.post('/', pergerakan.createPergerakan)

module.exports = router
