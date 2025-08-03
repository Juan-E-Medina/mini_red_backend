const bcrypt = require('bcrypt')
const usersRouter = require('express').Router()
const User = require('../models/user')
const userExtractor = require('../middleware/userExtractor')
const checkAdmin = require('../middleware/checkAdmin')

// Obtener todos los usuarios (para vista general)
usersRouter.get('/', async (req, res) => {
  const users = await User.find({})
    .populate({
      path: 'blogs',
      options: { sort: { likes: -1 } }
    })

  res.json(users)
})

// Crear usuario (solo admin)
usersRouter.post('/', userExtractor, checkAdmin, async (req, res) => {
  const { username, name, password, role } = req.body

  if (!password || password.length < 3) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 3 caracteres' })
  }

  const usernameExists = await User.findOne({ username })
  const nameExists = await User.findOne({ name })

  if (usernameExists) {
    return res.status(400).json({ error: 'El username ya está en uso' })
  }
  if (nameExists) {
    return res.status(400).json({ error: 'El nombre ya está en uso' })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const user = new User({
    username,
    name,
    passwordHash,
    role: role === 'admin' ? 'admin' : 'user',
    ratings: [],
    averageRating: 0,
    category: 'baja'
  })

  const savedUser = await user.save()
  res.status(201).json(savedUser)
})

// Calificar usuario (user califica a otro)
usersRouter.put('/:id/rate', userExtractor, async (req, res) => {
  const ratedUserId = req.params.id
  const raterUser = req.user
  const { score } = req.body

  if (!score || score < 1 || score > 5) {
    return res.status(400).json({ error: 'La calificación debe estar entre 1 y 5' })
  }

  if (ratedUserId === raterUser.id.toString()) {
    return res.status(400).json({ error: 'No puedes calificarte a ti mismo' })
  }

  const userToRate = await User.findById(ratedUserId)
  if (!userToRate) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }

  // Ver si ya lo ha calificado
  const existingRating = userToRate.ratings.find(r => r.rater.toString() === raterUser.id)

  if (existingRating) {
    existingRating.score = score // Editar puntuación
  } else {
    userToRate.ratings.push({ rater: raterUser.id, score })
  }

  // Recalcular promedio y categoría
  const total = userToRate.ratings.reduce((sum, r) => sum + r.score, 0)
  const avg = total / userToRate.ratings.length
  userToRate.averageRating = avg.toFixed(2)

  if (avg >= 4.0) userToRate.category = 'alta'
  else if (avg >= 2.5) userToRate.category = 'media'
  else userToRate.category = 'baja'

  await userToRate.save()
  res.json({ message: 'Calificación actualizada', average: userToRate.averageRating, category: userToRate.category })
})
