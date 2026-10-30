import { z } from 'zod'
import { validate } from '../../http/validation.js'
import { HttpError } from '../../http/errors.js'
import { pagination, paged } from '../../http/pagination.js'
import * as service from './service.js'

const flagStore = z.object({ ativa: z.boolean() }).strict()
const flagProduct = z.object({ ativo: z.boolean(), versao: z.number().int().min(1) }).strict()
const rateSchema = z.object({ percentual_comissao: z.string() }).strict()
const reportSchema = z.object({
  de: z.iso.date().optional(),
  ate: z.iso.date().optional(),
  agrupar: z.enum(['dia', 'semana', 'mes']).optional(),
}).strict()

function uuid(req, entity) {
  if (!z.uuid().safeParse(req.params.id).success) {
    throw new HttpError(404, 'NAO_ENCONTRADO', `${entity} não encontrado.`)
  }
  return req.params.id
}

export function createAdminController(pool) {
  return {
    async listOrders(req, res) {
      const page = pagination(req.query)
      const result = await service.listOrders(pool, page)
      paged(res, result.rows, result.total, page)
    },
    async confirmOrder(req, res) {
      const id = uuid(req, 'Pedido')
      res.json({ data: await service.confirmOrder(pool, id) })
    },
    async listStores(req, res) {
      const page = pagination(req.query)
      const result = await service.listStores(pool, page)
      paged(res, result.rows, result.total, page)
    },
    async updateStore(req, res) {
      const id = uuid(req, 'Loja')
      const { ativa } = validate(flagStore, req.body)
      res.json({ data: await service.updateStore(pool, id, ativa) })
    },
    async listProducts(req, res) {
      const page = pagination(req.query)
      const result = await service.listProducts(pool, page)
      paged(res, result.rows, result.total, page)
    },
    async updateProduct(req, res) {
      const id = uuid(req, 'Produto')
      const { ativo, versao } = validate(flagProduct, req.body)
      res.json({ data: await service.updateProduct(pool, id, ativo, versao) })
    },
    async salesReport(req, res) {
      res.json({ data: await service.salesReport(pool, validate(reportSchema, req.query)) })
    },
    async updateCommission(req, res) {
      const { percentual_comissao } = validate(rateSchema, req.body)
      res.json({ data: await service.updateCommission(pool, percentual_comissao) })
    },
  }
}
