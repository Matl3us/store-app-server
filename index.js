//Express
const express = require('express')
const app = express()

//Multer
const multer = require('multer')
const storage = multer.diskStorage({
  destination: function (request, file, cb) {
    cb(null, 'tmp/')
  },
  filename: function (request, file, cb) {
    const uniqueSuffix = Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + '.png')
  }
})

//Environmental variables
const dotenv = require('dotenv')
dotenv.config()

//Fs
const fs = require('fs')

//Cloudinary
const cloudinary = require('cloudinary').v2
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
})
const upload = multer({ storage })

//Models import
const Item = require('./models/item')

//Requests

//Main page
app.get('/', (request, response) => {
  response.send('<h1>Hello World!</h1>')
})

//Get all items
app.get('/api/items', (request, response, next) => {
  Item.find({}).then(items => {
    response.json(items)
  })
    .catch(error => next(error))
})

//Get item by id
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

//Image upload
const cloudinaryImageUpload = async file => {
  return new Promise(resolve => {
    cloudinary.uploader.upload(file, (err, result) => {
      if (err) return result.status(500).send("upload image error")
      resolve({
        url: result.secure_url,
        id: result.public_id
      })
    }
    )
  })
}

//Create new items
app.post('/api/items', upload.array('images', 8), async (req, res, next) => {

  const urls = []
  const body = req.body
  const files = req.files

  for (const file of files) {
    const { path } = file
    const newPath = await cloudinaryImageUpload(path)
    urls.push(newPath)
    fs.unlinkSync(path)
  }

  const item = new Item({
    name: body.name,
    price: body.price,
    added: new Date(),
    photos: urls
  })

  console.log(item)

  item.save().then(savedItem => {
    res.json(savedItem)
  })
  .catch(error => next(error))

})

//Edit existing item
app.put('/api/items/:id', upload.array('images', 8), async (request, response, next) => {

  const urls = []
  const body = req.body
  const files = req.files



  for (const file of files) {
    const { path } = file
    const newPath = await cloudinaryImageUpload(path)
    urls.push(newPath)
    fs.unlinkSync(path)
  }

  const item = new Item({
    name: body.name,
    price: body.price,
    added: new Date(),
    photos: urls
  })

  console.log(item)

  Item.findByIdAndUpdate(request.params.id, item, { new: true })
    .then(updatedItem => {
      response.json(updatedItem)
    })
    .catch(error => next(error))
})

//Delete item
app.delete('/api/items/:id', (request, response, next) => {
  Item.findByIdAndRemove(request.params.id)
    .then(result => {
      result.photos.every((currentValue) => cloudinary.uploader.destroy(currentValue.id))
      response.status(204).end()
    })
    .catch(error => next(error))
})

//Unknown endpoint
const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

app.use(unknownEndpoint)

//Error handler
const errorHandler = (error, request, response, next) => {
  console.error(error.name)

  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' })
  }
  next(error)
}

app.use(errorHandler)

//Start server
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`)
})