import { z } from 'zod'
import { validate } from '../../http/validation.js'
import { HttpError } from '../../http/errors.js'
import { pagination, paged } from '../../http/pagination.js'
import { checkout } from './checkout.js'
import { getOrderFor, listOrders } from './service.js'
import { cancelOrder } from './transicoes.js'

const emptyBody = z.object({}).strict()

export function createOrderController(pool) {
  return {
    async checkout(req, res) {
      validate(emptyBody, req.body || {})
      const key = req.get('Idempotency-Key')
      if (!z.uuid().safeParse(key).success) throw new HttpError(400, 'ENTRADA_INVALIDA', 'Chave de checkout inválida.')
      const result = await checkout(pool, req.session.usuario.id, key)
      res.status(result.reused ? 200 : 201).json({ data: result.order })
    },
    async listOrders(req, res) {
      const page = pagination(req.query)
      const result = await listOrders(pool, page, { customerId: req.session.usuario.id })
      paged(res, result.rows, result.total, page)
    },
    async getOrder(req, res) {
      if (!z.uuid().safeParse(req.params.id).success) throw new HttpError(404, 'NAO_ENCONTRADO', 'Pedido não encontrado.')
      res.json({ data: await getOrderFor(pool, req.params.id, req.session) })
    },
    async cancelOrder(req, res) {
      if (!z.uuid().safeParse(req.params.id).success) throw new HttpError(404, 'NAO_ENCONTRADO', 'Pedido não encontrado.')
      validate(emptyBody, req.body || {})
      res.json({ data: await cancelOrder(pool, req.params.id, req.session) })
    },
  }
}
