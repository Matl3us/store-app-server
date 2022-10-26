const usersRouter = require('express').Router()
const User = require('../models/user')
const cloudinary = require('../utils/cloudinary')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const config = require('../utils/config')

const getTokenFrom = request => {
    const authorization = request.get('authorization')
    if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
        return authorization.substring(7)
    }
    return null
}

usersRouter.get('/', async (request, response) => {
    const users = await User
        .find({}).populate('items', { name: 1, price: 1, added: 1, photos: 1 })
    response.json(users)
})

usersRouter.get('/user', async (request, response) => {
    let decodedToken = null
    const token = getTokenFrom(request)

    try {
        decodedToken = jwt.verify(token, config.SECRET)
    } catch (exception) {
        return response.status(401).json({ error: 'token missing or invalid' })
    }

    const user = await User
        .findById(decodedToken.id, { items: 0 })
    response.json(user)
})

usersRouter.post('/', cloudinary.upload.none(), async (request, response) => {
    const { username, name, password } = request.body

    const existingUser = await User.findOne({ username })
    if (existingUser) {
        return response.status(400).json({
            error: 'username must be unique'
        })
    }

    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    const user = new User({
        username,
        name,
        passwordHash,
    })

    const savedUser = await user.save()

    response.status(201).json(savedUser)
})

module.exports = usersRouter