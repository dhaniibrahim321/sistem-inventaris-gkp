const rateLimit = require('express-rate-limit')

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Terlalu banyak permintaan dari perangkat Anda. Silakan coba lagi setelah 15 menit.',
    data: null,
  },
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    status: 'error',
    message: 'Terlalu banyak percobaan login yang gagal. Akun dikunci sementara selama 15 menit demi keamanan.',
    data: null,
  },
})

module.exports = { apiLimiter, loginLimiter }
