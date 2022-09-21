const mongoose = require('mongoose')

const itemSchema = new mongoose.Schema({
  name: String,
  price: String,
  added: Date,
  photos: [
    {
      url: String,
      photo_id: String
    }
  ]
})

itemSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
    returnedObject.photos.every((currentValue => delete currentValue._id))
  }
})

module.exports = mongoose.model('Item', itemSchema)