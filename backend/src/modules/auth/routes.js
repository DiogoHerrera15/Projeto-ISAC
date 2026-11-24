import { authRateLimit } from '../../http/rateLimit.js'
import { createAuthController } from './controller.js'

export function registerAuthRoutes(app, pool, config) {
  // Cadastro conta toda tentativa; login só conta as que falham (ver rateLimit.js).
  // Cada rota tem o seu próprio limite, para um não consumir o do outro.
  const signupLimit = authRateLimit()
  const loginLimit = authRateLimit({ countSuccess: false })
  const controller = createAuthController(pool, config)
  app.post('/api/v1/auth/cadastro', signupLimit, controller.register)
  app.post('/api/v1/auth/login', loginLimit, controller.login)
  app.get('/api/v1/auth/sessao', controller.getSession)
  app.post('/api/v1/auth/logout', controller.logout)
}
