const router = require('express').Router()

// Health Check
router.get('/health', (req, res) => res.json({ success: true, message: 'SIGKP API berjalan.' }))

module.exports = router
