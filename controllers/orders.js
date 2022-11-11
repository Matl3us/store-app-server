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

orderRouter.get('/owner', async (request, response, next) => {
    const token = getTokenFrom(request)

    if (!token) {
        return response.status(401).json({ error: 'token missing or invalid' })
    }

    try {
        const decodedToken = jwt.verify(token, config.SECRET);
        const order = await Order
            .find({ owner: decodedToken.id })
            .populate('owner', { username: 1, email: 1 })
            .populate('items', { name: 1, price: 1, added: 1, photos: 1, user: 1 })
        response.json(order)
    }
    catch (exception) {
        next(exception);
    }
})

orderRouter.get('/received', async (request, response, next) => {
    const token = getTokenFrom(request)

    if (!token) {
        return response.status(401).json({ error: 'token missing or invalid' })
    }

    try {
        const decodedToken = jwt.verify(token, config.SECRET);
        const pipeline = [
            {
                '$lookup': {
                    'from': 'items',
                    'localField': 'items',
                    'foreignField': '_id',
                    'as': 'result'
                }
            },
            { '$unwind': '$result' },
            {
                '$match': {
                    'result.user': mongoose.Types.ObjectId(decodedToken.id)
                }
            },
            { '$unset': ['items', '__v'] },
            {
                '$group': {
                    '_id': '$_id',
                    'added': { '$first': '$added' },
                    'orderedItems': {'$push': '$result' },
                    'firstName': { '$first': '$firstName' },
                    'lastName': { '$first': '$lastName' },
                    'address': { '$first': '$address' },
                    'zipCode': { '$first': '$zipCode' },
                    'city': { '$first': '$city' }
                }
            }
        ];
        const order = await Order
            .aggregate(pipeline)
        response.json(order)
    }
    catch (exception) {
        next(exception);
    }
})

orderRouter.post('/', async (request, response, next) => {
    const body = request.body
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
        await body.items.map(item => mongoose.Types.ObjectId(item))

        const order = new Order({
            added: new Date(),
            firstName: body.firstName,
            lastName: body.lastName,
            address: body.address,
            zipCode: body.zipCode,
            city: body.city,
            owner: user._id,
            items: body.items
        })

        const savedOrder = await order.save()
        user.orders = user.orders.concat(savedOrder._id)
        await user.save()

        response.json(savedOrder)
    } else {
        response.status(403).end()
    }

})

module.exports = orderRouter;