const router = require('express').Router()
const { authenticate, requireSuperAdmin } = require('../middleware/auth')
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter')
const auth = require('../controllers/authController')

router.post('/login', loginLimiter, auth.login)
router.post('/register', registerLimiter, auth.register)
router.get('/me', authenticate, auth.me)
router.get('/users', authenticate, requireSuperAdmin, auth.listUsers)
router.get('/users/pending-count', authenticate, requireSuperAdmin, auth.pendingCount)
router.patch('/users/:id/verify', authenticate, requireSuperAdmin, auth.verifyUser)
router.patch('/users/:id/deactivate', authenticate, requireSuperAdmin, auth.deactivateUser)

module.exports = router
