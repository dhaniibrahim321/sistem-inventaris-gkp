require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const routes = require('./routes')
const { apiLimiter } = require('./middleware/rateLimiter')
const { notFound, errorHandler } = require('./middleware/errorHandler')

const app = express()

// 1. HTTP Security Headers (menyembunyikan identitas Express & proteksi header)
app.use(helmet())

// 2. CORS: Mengizinkan request dari frontend
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }))

// 3. Rate Limiter: Melindungi semua endpoint /api dari flooding/spam
app.use('/api', apiLimiter)

// 4. Body parser dengan batas wajar (5 MB untuk payload data-URL gambar)
app.use(express.json({ limit: '5mb' }))

app.use('/api', routes)
app.use(notFound)
app.use(errorHandler)

module.exports = app
