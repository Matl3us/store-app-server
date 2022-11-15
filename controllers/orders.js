const orderRouter = require('express').Router()
const Order = require('../models/order')

const User = require('../models/user')
const Item = require('../models/item')

const jwt = require('jsonwebtoken')
const config = require('../utils/config')
const mongoose = require('mongoose')


const getTokenFrom = request => {
    const authorization = request.query.token
    if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
        return authorization.substring(7)
    }
    return null
}

const updateItemAmount = async items => {
    let itemCount = {}
    let error = false;
    items.forEach(item => {
        itemCount[item] = (itemCount[item] || 0) + 1;
    });
    for (const [key, value] of Object.entries(itemCount)) {
        const item = await Item.findById(key);
        if (item.amount - value < 0) {
            error = true;
        }
        else {
            item.amount = item.amount - value;
            item.save();
        }
    }
    return error;
}

orderRouter.get('/', async (request, response) => {
    const orders = await Order
        .find({})
        .populate('items', { name: 1, price: 1, photos: 1, description: 1 })
    response.json(orders)
})

orderRouter.get('/owner', async (request, response, next) => {
    const token = getTokenFrom(request)

    if (!token) {
        return response.status(401).json({ error: 'token missing or invalid' })
    }

    try {
        const decodedToken = jwt.verify(token, config.SECRET);
        const order = await Order
            .find({ owner: decodedToken.id })
            .populate('items', { name: 1, price: 1, photos: 1, description: 1 })
        response.json(order)
    }
    catch (exception) {
        next(exception);
    }
})

orderRouter.get('/receiver', async (request, response, next) => {
    const token = getTokenFrom(request)

    if (!token) {
        return response.status(401).json({ error: 'token missing or invalid' })
    }

    try {
        const decodedToken = jwt.verify(token, config.SECRET);
        const order = await Order
            .find({ receiver: decodedToken.id })
            .populate('items', { name: 1, price: 1, photos: 1, description: 1 })
        response.json(order)
    }
    catch (exception) {
        next(exception);
    }
})

orderRouter.post('/', async (request, response) => {

    const body = request.body
    const token = getTokenFrom(request)
    let user = null

    const pipeline = [
        {
            '$match': {
                '_id': {
                    '$in': await body.items.map(item => mongoose.Types.ObjectId(item))
                }
            }
        }, {
            '$group': {
                '_id': '$user',
                'itemId': {
                    '$push': '$_id'
                }
            }
        }
    ]

    const items = await Item.aggregate(pipeline)

    try {
        const decodedToken = jwt.verify(token, config.SECRET);
        user = await User.findById(decodedToken.id);
    }
    catch {
        const result = await updateItemAmount(body.items)
        if (result) {
            return response.status(401).json({ error: 'trying to buy more items than is available' })
        }

        for (const item of items) {

            const order = new Order({
                added: new Date(),
                firstName: body.firstName,
                lastName: body.lastName,
                address: body.address,
                zipCode: body.zipCode,
                city: body.city,
                receiver: item._id,
                owner: null,
                items: item.itemId
            })

            const savedOrder = order.save()
        }

        return response.status(200).json({ message: 'order saved' })
    }

    if (user) {
        const result = await updateItemAmount(body.items)
        if (result) {
            return response.status(401).json({ error: 'trying to buy more items than is available' })
        }

        for (const item of items) {

            const order = new Order({
                added: new Date(),
                firstName: body.firstName,
                lastName: body.lastName,
                address: body.address,
                zipCode: body.zipCode,
                city: body.city,
                receiver: item._id,
                owner: user,
                items: item.itemId
            })
            const savedOrder = order.save()
        }

        return response.status(200).json({ message: 'order saved' })
    }
})

module.exports = orderRouter;