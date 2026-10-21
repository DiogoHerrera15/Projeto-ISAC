import { requireSession } from '../auth/sessions.js'
import { createStoreController } from './controller.js'

export function registerStoreRoutes(app, pool) {
  const auth = requireSession(pool)
  const controller = createStoreController(pool)
  app.get('/api/v1/minha-loja', auth, controller.getOwnStore)
  app.post('/api/v1/minha-loja', auth, controller.createStore)
  app.patch('/api/v1/minha-loja', auth, controller.updateStore)
}

export function registerSalesRoutes(app, pool) {
  app.get('/api/v1/minha-loja/vendas', requireSession(pool), createStoreController(pool).listSales)
}
