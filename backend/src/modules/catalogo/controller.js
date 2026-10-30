import { z } from 'zod'
import { HttpError } from '../../http/errors.js'
import { pagination, paged } from '../../http/pagination.js'
import { loadSession } from '../auth/sessions.js'
import * as service from './service.js'

const ORDENS = ['recentes', 'menor', 'maior', 'nome']
const CATEGORIA = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function createCatalogController(pool) {
  return {
    async listProducts(req, res) {
      const { busca = '', lojaId = '', categoria = '', ordem = 'recentes' } = req.query
      if (typeof busca !== 'string' || busca.length > 120 || (lojaId && !z.uuid().safeParse(lojaId).success)
        || typeof categoria !== 'string' || (categoria && (categoria.length > 40 || !CATEGORIA.test(categoria)))
        || !ORDENS.includes(ordem)) {
        throw new HttpError(400, 'ENTRADA_INVALIDA', 'Filtro inválido.')
      }
      const page = pagination(req.query)
      const result = await service.listProducts(pool, { busca, lojaId, categoria, ordem, ...page })
      paged(res, result.rows, result.total, page)
    },
    async getProduct(req, res) {
      if (!z.uuid().safeParse(req.params.id).success) throw new HttpError(404, 'NAO_ENCONTRADO', 'Produto não encontrado.')
      const session = await loadSession(req, pool)
      res.json({ data: await service.getVisibleProduct(pool, req.params.id, session) })
    },
    async listStores(req, res) {
      const page = pagination(req.query)
      const result = await service.listStores(pool, page)
      paged(res, result.rows, result.total, page)
    },
    async listCategories(_req, res) {
      res.json({ data: await service.listCategories(pool) })
    },
    async getCommission(_req, res) {
      res.json({ data: await service.getCommission(pool) })
    },
  }
}
