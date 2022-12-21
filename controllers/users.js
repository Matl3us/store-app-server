const usersRouter = require('express').Router()
const User = require('../models/user')
const cloudinary = require('../utils/cloudinary')
const bcrypt = require('bcrypt')

const jwt = require('jsonwebtoken')
const config = require('../utils/config')

const getTokenFrom = request => {
    const authorization = request.query.token
    if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
        return authorization.substring(7)
    }
    return null
}

usersRouter.get('/user', async (request, response, next) => {
    const token = getTokenFrom(request)

    if (!token) {
        return response.status(401).json({ error: 'token missing or invalid' })
    }

    try {
        const decodedToken = jwt.verify(token, config.SECRET);
        const user = await User.findById(decodedToken.id, { username: 1, email: 1 });
        response.json(user)
    }
    catch (exception) {
        next(exception);
    }
})

usersRouter.get('/', async (request, response) => {
    const users = await User
        .find({}).populate('items', { name: 1, price: 1, added: 1, photos: 1 })
    response.json(users)
})

usersRouter.post('/', cloudinary.upload.none(), async (request, response) => {
    const { username, email, password } = request.body

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
        email,
        passwordHash,
    })

    const savedUser = await user.save()

    response.status(201).json(savedUser)
})

usersRouter.put('/password', async (request, response, next) => {
    const token = getTokenFrom(request)
    const { newPassword, oldPassword } = request.body;

    if (newPassword == null || oldPassword == null) {
        return response.status(401).json({ error: 'password missing' })
    }

    if (!token) {
        return response.status(401).json({ error: 'token missing or invalid' })
    }

    try {
        const decodedToken = jwt.verify(token, config.SECRET);

        const user = await User.findById(decodedToken.id)
        const passwordCorrect = user === null
            ? false
            : await bcrypt.compare(oldPassword, user.passwordHash)

        if (!(user && passwordCorrect)) {
            return response.status(401).json({
                error: 'invalid password'
            })
        };

        const saltRounds = 10
        const passwordHash = await bcrypt.hash(newPassword, saltRounds)

        const newUser = {
            passwordHash
        }

        User.findByIdAndUpdate(decodedToken.id, newUser, { new: true })
            .then(updatedUser => {
                response.json(updatedUser)
            })
            .catch(error => next(error))
    }
    catch (exception) {
        next(exception);
    }
})

module.exports = usersRouter