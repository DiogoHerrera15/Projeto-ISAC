import { z } from 'zod'
import { validate } from '../../http/validation.js'
import { HttpError } from '../../http/errors.js'
import { requireSession } from '../auth/sessions.js'
import { checkout } from './checkout.js'
import { listOrders } from './repository.js'
import { cancelOrder } from './transicoes.js'

export function registerOrderRoutes(app, pool) {
  const auth = requireSession(pool)
  app.post('/api/v1/pedidos', auth, async (req, res) => {
    validate(z.object({}).strict(), req.body || {})
    const key = req.get('Idempotency-Key')
    if (!z.uuid().safeParse(key).success) throw new HttpError(400, 'ENTRADA_INVALIDA', 'Chave de checkout inválida.')
    const result = await checkout(pool, req.session.usuario.id, key)
    res.status(result.reused ? 200 : 201).json({ data: result.order })
  })
  app.get('/api/v1/pedidos', auth, async (req, res) => {
    await listOrders(pool, res, req, { customerId: req.session.usuario.id })
  })
  app.post('/api/v1/pedidos/:id/cancelamento', auth, async (req, res) => {
    if (!z.uuid().safeParse(req.params.id).success) throw new HttpError(404, 'NAO_ENCONTRADO', 'Pedido não encontrado.')
    validate(z.object({}).strict(), req.body || {})
    res.json({ data: await cancelOrder(pool, req.params.id, req.session) })
  })
}
