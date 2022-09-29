const config = require('./utils/config')
const express = require('express')
const cors = require('cors')
const app = express()
const itemsRouter = require('./controllers/items')
const usersRouter = require('./controllers/users')
const loginRouter = require('./controllers/login')
const categoriesRouter = require('./controllers/categories')
const middleware = require('./utils/middleware')
const logger = require('./utils/logger')
const mongoose = require('mongoose')

logger.info('Connecting to MongoDB')

mongoose.connect(config.MONGODB_URI)
  .then(() => {
    logger.info('Connected to MongoDB')
  })
  .catch((error) => {
    logger.error('Error connecting to MongoDB:', error.message)
  })

app.use(cors())
app.use(express.json())

app.use('/api/items', itemsRouter)
app.use('/api/users', usersRouter)
app.use('/api/login', loginRouter)
app.use('/api/categories', categoriesRouter)

app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)

module.exports = app