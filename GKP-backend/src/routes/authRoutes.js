const router = require('express').Router()
const authenticate = require('../middleware/auth')
const { loginLimiter } = require('../middleware/rateLimiter')
const auth = require('../controllers/authController')

// Publik (dengan proteksi anti brute-force)
router.post('/login', loginLimiter, auth.login)

// Wajib token
router.get('/me', authenticate, auth.me)

module.exports = router
