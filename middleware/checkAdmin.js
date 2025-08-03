const checkAdmin = (request, response, next) => {
  if (!request.user || request.user.role !== 'admin') {
    return response.status(403).json({ error: 'Acceso restringido a administradores' })
  }
  next()
}

module.exports = checkAdmin
