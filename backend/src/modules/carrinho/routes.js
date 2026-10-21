import { requireSession } from '../auth/sessions.js'
import { createCartController } from './controller.js'

export function registerCartRoutes(app, pool) {
  const auth = requireSession(pool)
  const controller = createCartController(pool)
  app.get('/api/v1/carrinho', auth, controller.getCart)
  app.put('/api/v1/carrinho/itens/:produtoId', auth, controller.setQuantity)
  app.delete('/api/v1/carrinho/itens/:produtoId', auth, controller.removeItem)
}
