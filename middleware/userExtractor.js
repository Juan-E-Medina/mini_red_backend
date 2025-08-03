const jwt = require('jsonwebtoken')
const User = require('../models/user')

const userExtractor = async (request, response, next) => {
  const authorization = request.get('authorization')
  if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
    const token = authorization.substring(7)
    try {
      const decodedToken = jwt.verify(token, process.env.SECRET)
      if (!decodedToken.id) {
        return response.status(401).json({ error: 'token inválido' })
      }
      request.user = await User.findById(decodedToken.id)
    } catch (error) {
      return response.status(401).json({ error: 'token inválido' })
    }
  } else {
    return response.status(401).json({ error: 'token faltante' })
  }
  next()
}

module.exports = userExtractor
