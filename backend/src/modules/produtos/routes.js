import { requireSession } from '../auth/sessions.js'
import { createProductController } from './controller.js'

export function registerProductRoutes(app, pool) {
  const auth = requireSession(pool)
  const controller = createProductController(pool)
  app.get('/api/v1/minha-loja/produtos', auth, controller.listProducts)
  app.post('/api/v1/minha-loja/produtos', auth, controller.createProduct)
  app.patch('/api/v1/minha-loja/produtos/:id', auth, controller.updateProduct)
}
