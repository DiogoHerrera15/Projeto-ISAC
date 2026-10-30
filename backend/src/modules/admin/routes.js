import { requireSession, requireAdmin } from '../auth/sessions.js'
import { createAdminController } from './controller.js'

export function registerAdminRoutes(app, pool) {
  const auth = [requireSession(pool), requireAdmin]
  const controller = createAdminController(pool)
  app.get('/api/v1/admin/pedidos', ...auth, controller.listOrders)
  app.post('/api/v1/admin/pedidos/:id/confirmacao', ...auth, controller.confirmOrder)
  app.get('/api/v1/admin/lojas', ...auth, controller.listStores)
  app.patch('/api/v1/admin/lojas/:id', ...auth, controller.updateStore)
  app.get('/api/v1/admin/produtos', ...auth, controller.listProducts)
  app.patch('/api/v1/admin/produtos/:id', ...auth, controller.updateProduct)
  app.get('/api/v1/admin/relatorios/vendas', ...auth, controller.salesReport)
  app.patch('/api/v1/admin/configuracoes/comissao', ...auth, controller.updateCommission)
}
