const itemRouter = require('express').Router()

const Item = require('../models/item')
const User = require('../models/user')

const cloudinary = require('../utils/cloudinary')
const config = require('../utils/config')
const cors = require('cors')

const jwt = require('jsonwebtoken')
const fs = require('fs')


const getTokenFrom = request => {
    const authorization = request.query.token
    if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
        return authorization.substring(7)
    }
    return null
}

itemRouter.get('/user', cors(), async (request, response, next) => {
    const token = getTokenFrom(request)

    if (!token) {
        return response.status(401).json({ error: 'token missing or invalid' })
    }

    try {
        const decodedToken = jwt.verify(token, config.SECRET);
        const user = await User
            .findById(decodedToken.id)
            .populate('items', { name: 1, price: 1, added: 1, photos: 1, amount: 1, description: 1 })
        response.json(user)
    }
    catch (exception) {
        next(exception);
    }
})

itemRouter.get('/', async (request, response) => {
    const categoryName = request.query.category;
    const filter = request.query.filter;
    const sort = request.query.sort;
    let items = null;
    if (filter !== undefined) {
        if (sort === 'DateUp') {
            items = await Item
                .find({ category: categoryName, subcategory: filter, amount: { $gt: 0 } }, { user: 0 })
                .sort({ added: 1 });
        } else if (sort === 'DateDown') {
            items = await Item
                .find({ category: categoryName, subcategory: filter, amount: { $gt: 0 } }, { user: 0 })
                .sort({ added: -1 });
        } else if (sort === 'PriceUp') {
            items = await Item
                .find({ category: categoryName, subcategory: filter, amount: { $gt: 0 } }, { user: 0 })
                .sort({ price: -1 });
        } else if (sort === 'PriceDown') {
            items = await Item
                .find({ category: categoryName, subcategory: filter, amount: { $gt: 0 } }, { user: 0 })
                .sort({ price: 1 });
        } else if (sort === 'PopularityUp') {
            items = await Item
                .find({ category: categoryName, subcategory: filter, amount: { $gt: 0 } }, { user: 0 })
                .sort({ bought: -1 });
        } else {
            items = await Item
                .find({ category: categoryName, subcategory: filter, amount: { $gt: 0 } }, { user: 0 });
        }
    } else {
        if (sort === 'DateUp') {
            items = await Item
                .find({ category: categoryName, amount: { $gt: 0 } }, { user: 0 })
                .sort({ added: 1 });
        } else if (sort === 'DateDown') {
            items = await Item
                .find({ category: categoryName, amount: { $gt: 0 } }, { user: 0 })
                .sort({ added: -1 });
        } else if (sort === 'PriceUp') {
            items = await Item
                .find({ category: categoryName, amount: { $gt: 0 } }, { user: 0 })
                .sort({ price: -1 });
        } else if (sort === 'PriceDown') {
            items = await Item
                .find({ category: categoryName, amount: { $gt: 0 } }, { user: 0 })
                .sort({ price: 1 });
        } else if (sort === 'PopularityUp') {
            items = await Item
                .find({ category: categoryName, amount: { $gt: 0 } }, { user: 0 })
                .sort({ bought: -1 });
        } else {
            items = await Item
                .find({ category: categoryName, amount: { $gt: 0 } }, { user: 0 });
        }
    }

    response.json(items)
})

itemRouter.post('/', cors(), cloudinary.upload.array('images', 8), async (request, response, next) => {
    const urls = []
    const body = request.body
    const files = request.files
    const token = getTokenFrom(request)
    let user = null

    if (!token) {
        return response.status(401).json({ error: 'token missing or invalid' })
    }

    try {
        const decodedToken = jwt.verify(token, config.SECRET);
        user = await User.findById(decodedToken.id);
    }
    catch (exception) {
        next(exception);
    }

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
            subcategory: body.subcategory,
            description: body.description,
            amount: body.amount,
            bought: 0,
            photos: urls,
            user: user._id
        });

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
    console.log(request.params.id);
    Item.findByIdAndRemove(request.params.id)
        .then(result => {
            result.photos.every((currentValue) => cloudinary.cloudinaryImageDeletion(currentValue.photo_id))
            response.status(204).end()
        })
        .catch(error => next(error))
})

itemRouter.get('/:id', async (request, response, next) => {

    const token = request.headers.authorization;

    console.log(token);

    response.status(404).end();
})

module.exports = itemRouter