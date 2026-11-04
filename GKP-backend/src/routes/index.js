const router = require('express').Router()

// Health Check
router.get('/health', (req, res) => res.json({ success: true, message: 'SIGKP API berjalan.' }))

//nawaf
router.use('/dashboard', require('./dashboardRoutes'))
router.use('/stok', require('./stokRoutes'))
router.use('/opname', require('./opnameRoutes'))

module.exports = router
