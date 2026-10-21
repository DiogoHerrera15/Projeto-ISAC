import { z } from 'zod'
import { validate } from '../../http/validation.js'
import { HttpError } from '../../http/errors.js'
import * as service from './service.js'

const quantitySchema = z.object({ quantidade: z.number().int().min(1).max(999) }).strict()

function productId(req) {
  if (!z.uuid().safeParse(req.params.produtoId).success) throw new HttpError(400, 'ENTRADA_INVALIDA', 'Produto inválido.')
  return req.params.produtoId
}

export function createCartController(pool) {
  return {
    async getCart(req, res) {
      res.json({ data: await service.getCart(pool, req.session.usuario.id) })
    },
    async setQuantity(req, res) {
      const id = productId(req)
      const { quantidade } = validate(quantitySchema, req.body)
      res.json({ data: await service.setQuantity(pool, req.session.usuario.id, id, quantidade) })
    },
    async removeItem(req, res) {
      await service.removeItem(pool, req.session.usuario.id, productId(req))
      res.status(204).end()
    },
  }
}
