import { z } from 'zod'
import { validate } from '../../http/validation.js'
import { pagination, paged } from '../../http/pagination.js'
import * as service from './service.js'

const createSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  descricao: z.string().max(2000).nullable().optional(),
}).strict()
const updateSchema = createSchema.partial().extend({ ativa: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0)

export function createStoreController(pool) {
  return {
    async getOwnStore(req, res) {
      res.json({ data: await service.ownStore(pool, req.session.usuario.id) })
    },
    async createStore(req, res) {
      const fields = validate(createSchema, req.body)
      res.status(201).json({ data: await service.createStore(pool, req.session.usuario.id, fields) })
    },
    async updateStore(req, res) {
      const fields = validate(updateSchema, req.body)
      res.json({ data: await service.updateStore(pool, req.session.usuario.id, fields) })
    },
    async listSales(req, res) {
      const page = pagination(req.query)
      const result = await service.listSales(pool, req.session.usuario.id, page)
      paged(res, result.rows, result.total, page)
    },
  }
}
