import { requireSession } from '../auth/sessions.js'
import { createOrderController } from './controller.js'

export function registerOrderRoutes(app, pool) {
  const auth = requireSession(pool)
  const controller = createOrderController(pool)
  app.post('/api/v1/pedidos', auth, controller.checkout)
  app.get('/api/v1/pedidos', auth, controller.listOrders)
  app.get('/api/v1/pedidos/:id', auth, controller.getOrder)
  app.post('/api/v1/pedidos/:id/cancelamento', auth, controller.cancelOrder)
}
