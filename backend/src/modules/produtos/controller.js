import { z } from 'zod'
import { validate } from '../../http/validation.js'
import { HttpError } from '../../http/errors.js'
import { pagination, paged } from '../../http/pagination.js'
import * as service from './service.js'

const price = z.string().refine((value) =>
  /^(0|[1-9]\d{0,9})\.\d{2}$/.test(value) && BigInt(value.replace('.', '')) > 0n,
)
const createSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  descricao: z.string().max(2000).nullable().optional(),
  preco: price,
  estoque: z.number().int().min(0),
  ativo: z.boolean(),
  imagem_id: z.uuid().nullable().optional(),
  categoria_id: z.string().max(40).nullable().optional(),
}).strict()
const updateSchema = createSchema.partial().extend({ versao: z.number().int().min(1) })
  .refine((value) => Object.keys(value).some((key) => key !== 'versao'))

export function createProductController(pool) {
  return {
    async listProducts(req, res) {
      const page = pagination(req.query)
      const result = await service.listOwnProducts(pool, req.session.usuario.id, page)
      paged(res, result.rows, result.total, page)
    },
    async createProduct(req, res) {
      const fields = validate(createSchema, req.body)
      res.status(201).json({ data: await service.createProduct(pool, req.session.usuario.id, fields) })
    },
    async updateProduct(req, res) {
      const fields = validate(updateSchema, req.body)
      if (!z.uuid().safeParse(req.params.id).success) throw new HttpError(404, 'NAO_ENCONTRADO', 'Produto não encontrado.')
      res.json({ data: await service.updateProduct(pool, req.session.usuario.id, req.params.id, fields) })
    },
  }
}
