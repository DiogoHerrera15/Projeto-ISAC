import { authRateLimit } from '../../http/rateLimit.js'
import { createAuthController } from './controller.js'

export function registerAuthRoutes(app, pool, config) {
  const limit = authRateLimit()
  const controller = createAuthController(pool, config)
  app.post('/api/v1/auth/cadastro', limit, controller.register)
  app.post('/api/v1/auth/login', limit, controller.login)
  app.get('/api/v1/auth/sessao', controller.getSession)
  app.post('/api/v1/auth/logout', controller.logout)
}
