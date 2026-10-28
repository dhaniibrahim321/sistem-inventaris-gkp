const rateLimit = require('express-rate-limit')

// 1. Limiter API Umum: Melindungi server dari spam DDoS atau bot scraping (300 req / 15 menit)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak permintaan dari perangkat Anda. Silakan coba lagi setelah 15 menit.',
  },
})

// 2. Limiter Khusus LOGIN: Mencegah brute-force password oleh orang iseng / hacker
// Maksimal 5 kali percobaan GAGAL per 15 menit per IP. Jika login berhasil, counter di-reset.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan login yang gagal. Akun dikunci sementara selama 15 menit demi keamanan.',
  },
})

module.exports = { apiLimiter, loginLimiter }
