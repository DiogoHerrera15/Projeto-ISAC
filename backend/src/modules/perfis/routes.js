import { requireSession } from '../auth/sessions.js'
import { createProfileController } from './controller.js'

export function registerProfileRoutes(app, pool) {
  const auth = requireSession(pool)
  const controller = createProfileController(pool)
  app.get('/api/v1/perfil', auth, controller.getProfile)
  app.patch('/api/v1/perfil', auth, controller.updateProfile)
}
