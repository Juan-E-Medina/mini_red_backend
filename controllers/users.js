const bcrypt = require('bcrypt')
const usersRouter = require('express').Router()
const User = require('../models/user')
const checkAdmin = require('../middleware/checkAdmin')
const userExtractor = require('../middleware/userExtractor')

// Crear nuevo usuario (solo admin)
usersRouter.post('/', userExtractor, checkAdmin, async (request, response) => {
  const { username, name, password, role } = request.body

  if (!password || password.length < 3) {
    return response.status(400).json({ error: 'La contraseña debe tener al menos 3 caracteres.' })
  }

  const existingUsername = await User.findOne({ username })
  if (existingUsername) {
    return response.status(400).json({ error: 'El username ya está registrado.' })
  }

  const existingName = await User.findOne({ name })
  if (existingName) {
    return response.status(400).json({ error: 'El name ya está registrado.' })
  }

  const saltRounds = 10
  const passwordHash = await bcrypt.hash(password, saltRounds)

  const user = new User({
    username,
    name,
    passwordHash,
    role: role === 'admin' ? 'admin' : 'user'
  })

  const savedUser = await user.save()
  response.status(201).json(savedUser)
})

// Calificar a un usuario
usersRouter.put('/:id/rate', userExtractor, async (request, response) => {
  const { rating } = request.body
  const ratedUserId = request.params.id
  const raterUserId = request.user.id

  if (rating < 1 || rating > 5) {
    return response.status(400).json({ error: 'La calificación debe estar entre 1 y 5.' })
  }

  const ratedUser = await User.findById(ratedUserId)
  if (!ratedUser) {
    return response.status(404).json({ error: 'Usuario no encontrado.' })
  }

  if (ratedUserId === raterUserId) {
    return response.status(400).json({ error: 'No puedes calificarte a ti mismo.' })
  }

  // Buscar si ya existe una calificación
  const existingRatingIndex = ratedUser.ratingsReceived.findIndex(
    (entry) => entry.fromUser.toString() === raterUserId
  )

  if (existingRatingIndex !== -1) {
    ratedUser.ratingsReceived[existingRatingIndex].rating = rating
  } else {
    ratedUser.ratingsReceived.push({
      fromUser: raterUserId,
      rating
    })
  }

  // Calcular promedio
  const ratings = ratedUser.ratingsReceived.map(entry => entry.rating)
  const average = ratings.reduce((a, b) => a + b, 0) / ratings.length
  ratedUser.averageRating = Number(average.toFixed(2))

  // Asignar categoría
  if (average >= 4.0) ratedUser.category = 'Alta'
  else if (average >= 2.5) ratedUser.category = 'Media'
  else ratedUser.category = 'Baja'

  const updatedUser = await ratedUser.save()
  response.json(updatedUser)
})

module.exports = usersRouter

