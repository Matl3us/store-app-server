const itemRouter = require('express').Router()

const Item = require('../models/item')
const User = require('../models/user')

const cloudinary = require('../utils/cloudinary')
const config = require('../utils/config')

const jwt = require('jsonwebtoken')
const fs = require('fs')


const getTokenFrom = request => {
    const authorization = request.get('authorization')
    if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
        return authorization.substring(7)
    }
    return null
}

itemRouter.get('/', async (request, response) => {
    const categoryName = request.query.category
    const items = await Item
        .find({ category: categoryName }, { user: 0 })

    response.json(items)
})

itemRouter.get('/:id', async (request, response, next) => {
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
    let decodedToken = null

    const token = getTokenFrom(request)

    try {
        decodedToken = jwt.verify(token, config.SECRET)
    } catch (exception) {
        next(exception)
    }

    if (!decodedToken.id) {
        return response.status(401).json({ error: 'token missing or invalid' })
    }
    const user = await User.findById(decodedToken.id)

    if (user) {
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
            category: body.category,
            photos: urls,
            user: user._id
        })

        const savedItem = await item.save()
        user.items = user.items.concat(savedItem._id)
        await user.save()

        response.json(savedItem)
    }
    else {
        for (const file of files) {
            const { path } = file
            fs.unlinkSync(path)
        }
        response.status(403).end()
    }

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