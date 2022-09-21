const itemRouter = require('express').Router()
const Item = require('../models/item')
const cloudinary = require('../utils/cloudinary')
const fs = require('fs')

itemRouter.get('/', (request, response) => {
    Item.find({}).then(items => {
        response.json(items)
    })
})

itemRouter.get('/:id', (request, response, next) => {
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

itemRouter.post('/', cloudinary.upload.array('images', 8), async (request, response, next) => {

    const urls = []
    const body = request.body
    const files = request.files

    for (const file of files) {
        const { path } = file
        const newPath = await cloudinary.cloudinaryImageUpload(path)
        urls.push(newPath)
        fs.unlinkSync(path)
    }

    const item = new Item({
        name: body.name,
        price: body.price,
        added: new Date(),
        photos: urls
    })

    item.save().then(savedItem => {
        response.json(savedItem)
    })
        .catch(error => next(error))

})

itemRouter.put('/:id', cloudinary.upload.array('images', 8), async (request, response, next) => {

    const body = request.body
    const files = request.files

    Item.findById(request.params.id)
        .then(async item => {
            const idList = []
            if (item) {
                for (const photo of body.photos) {
                    idList.push(photo.photo_id)
                }
                item.photos.forEach((currentValue) => {
                    if (!idList.includes(currentValue.photo_id)) {
                        cloudinary.cloudinaryImageDeletion(currentValue.photo_id)
                    }
                })

                for (const file of files) {
                    const { path } = file
                    const newPath = await cloudinary.cloudinaryImageUpload(path)
                    body.photos.push(newPath)
                    fs.unlinkSync(path)
                }

                const item = {
                    name: body.name,
                    price: body.price,
                    photos: body.photos
                }

                Item.findByIdAndUpdate(request.params.id, item, { new: true })
                    .then(updatedItem => {
                        response.json(updatedItem)
                    })
                    .catch(error => next(error))
            } else {
                response.status(404).end()
            }
        })
        .catch(error => {
            files.forEach(({ path }) => fs.unlinkSync(path))
            next(error)
        })
})

itemRouter.delete('/:id', (request, response, next) => {
    Item.findByIdAndRemove(request.params.id)
        .then(result => {
            result.photos.every((currentValue) => cloudinary.cloudinaryImageDeletion(currentValue.photo_id))
            response.status(204).end()
        })
        .catch(error => next(error))
})

module.exports = itemRouter