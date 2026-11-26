import { authRateLimit } from '../../http/rateLimit.js'
import { createAuthController } from './controller.js'
import { requireSession } from './sessions.js'

export function registerAuthRoutes(app, pool, config, mailer) {
  // Cadastro conta toda tentativa; login só conta as que falham (ver rateLimit.js).
  // Cada rota tem o seu próprio limite, para um não consumir o do outro.
  const signupLimit = authRateLimit()
  const loginLimit = authRateLimit({ countSuccess: false })
  const passwordLimit = authRateLimit({ countSuccess: false })
  const recoveryLimit = authRateLimit({ attempts: 5 }) // cada pedido pode mandar um e-mail
  const resetLimit = authRateLimit({ countSuccess: false })
  const controller = createAuthController(pool, config, mailer)
  app.post('/api/v1/auth/cadastro', signupLimit, controller.register)
  app.post('/api/v1/auth/login', loginLimit, controller.login)
  app.get('/api/v1/auth/sessao', controller.getSession)
  app.post('/api/v1/auth/logout', controller.logout)
  app.post('/api/v1/auth/senha', requireSession(pool), passwordLimit, controller.changePassword)
  app.post('/api/v1/auth/recuperacao', recoveryLimit, controller.requestPasswordReset)
  app.post('/api/v1/auth/redefinicao', resetLimit, controller.resetPassword)
}
