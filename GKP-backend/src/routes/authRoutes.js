const router = require('express').Router()
const authenticate = require('../middleware/auth')
const { loginLimiter } = require('../middleware/rateLimiter')
const auth = require('../controllers/authController')

router.post('/login', loginLimiter, auth.login)
router.get('/me', authenticate, auth.me)

module.exports = router
