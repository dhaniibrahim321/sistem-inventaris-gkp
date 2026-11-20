require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const routes = require('./routes')
const { apiLimiter } = require('./middleware/rateLimiter')
const { notFound, errorHandler } = require('./middleware/errorHandler')

const app = express()

app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }))
app.use('/api', apiLimiter)
app.use(express.json({ limit: '5mb' }))

app.use('/api', routes)
app.use(notFound)
app.use(errorHandler)

module.exports = app
