const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'endpoint desconocido' })
}

const errorHandler = (error, request, response, next) => {
  console.error(error.message)

  if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message })
  } else if (error.name === 'JsonWebTokenError') {
    return response.status(401).json({ error: 'token inválido' })
  }

  next(error)
}

module.exports = {
  unknownEndpoint,
  errorHandler
}
