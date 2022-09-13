const express = require('express')
const app = express()
require('dotenv').config()
const Item = require('./models/item')

app.use(express.static('build'))
app.use(express.json())

app.get('/', (request, response) => {
  response.send('<h1>Hello World!</h1>')
})

app.get('/api/items', (request, response, next) => {
  Item.find({}).then(items => {
    response.json(items)
  })
    .catch(error => next(error))
})

app.get('/api/items/:id', (request, response, next) => {
  Item.findById(request.params.id)
    .then(item => {
      if (item) {
        response.json(item)
      } else {
        response.status(404).end()
      }
    })
    .catch(error => next(error))
})

app.post('/api/items', (request, response, next) => {
  const body = request.body

  if (body.name === undefined || body.price === undefined) {
    return response.status(400).json({ error: 'content missing' })
  }

  const item = new Item({
    name: body.name,
    price: body.price,
    date: new Date()
  })

  item.save().then(savedItem => {
    response.json(savedItem)
  })
    .catch(error => next(error))
})

app.put('/api/items/:id', (request, response, next) => {
  const body = request.body

  const item = {
    name: body.name,
    price: body.price
  }

  Item.findByIdAndUpdate(request.params.id, item, { new: true })
    .then(updatedItem => {
      response.json(updatedItem)
    })
    .catch(error => next(error))
})

app.delete('/api/items/:id', (request, response, next) => {
  Item.findByIdAndRemove(request.params.id)
    .then(result => {
      response.status(204).end()
    })
    .catch(error => next(error))
})

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

app.use(unknownEndpoint)

const errorHandler = (error, request, response, next) => {
  console.error(error.name)

  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' })
  }
  next(error)
}

app.use(errorHandler)

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})