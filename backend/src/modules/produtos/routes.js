import { z } from 'zod'
import { validate } from '../../http/validation.js'
import { HttpError } from '../../http/errors.js'
import { pagination, paged } from '../../http/pagination.js'
import { requireSession } from '../auth/sessions.js'
import { ownStore } from '../lojas/routes.js'
import { fetchProduct, productFields, publicProduct } from '../catalogo/routes.js'

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
}).strict()
const updateSchema = createSchema.partial().extend({ versao: z.number().int().min(1) })
  .refine((value) => Object.keys(value).some((key) => key !== 'versao'))

async function imageUrl(pool, imageId, storeId) {
  if (!imageId) return null
  const { rows } = await pool.query('select id from imagens where id = $1 and loja_id = $2', [imageId, storeId])
  if (!rows.length) throw new HttpError(404, 'NAO_ENCONTRADO', 'Imagem não encontrada nesta loja.')
  return `/api/v1/imagens/${imageId}`
}

export function registerProductRoutes(app, pool) {
  const auth = requireSession(pool)
  app.get('/api/v1/minha-loja/produtos', auth, async (req, res) => {
    const store = await ownStore(pool, req.session.usuario.id)
    if (!store) throw new HttpError(404, 'NAO_ENCONTRADO', 'Loja não encontrada.')
    const page = pagination(req.query)
    const count = await pool.query('select count(*)::int as total from produtos where loja_id = $1', [store.id])
    const result = await pool.query(
      `select ${productFields} from produtos p join lojas l on l.id = p.loja_id
       where p.loja_id = $1 order by p.criado_em desc, p.id desc limit $2 offset $3`,
      [store.id, page.limit, page.offset],
    )
    paged(res, result.rows, count.rows[0].total, page)
  })
  app.post('/api/v1/minha-loja/produtos', auth, async (req, res) => {
    const fields = validate(createSchema, req.body)
    const store = await ownStore(pool, req.session.usuario.id)
    if (!store) throw new HttpError(404, 'NAO_ENCONTRADO', 'Loja não encontrada.')
    const url = await imageUrl(pool, fields.imagem_id, store.id)
    const result = await pool.query(
      `insert into produtos(loja_id, nome, descricao, preco, estoque, ativo, imagem_id, foto_url)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
      [store.id, fields.nome, fields.descricao ?? null, fields.preco, fields.estoque,
        fields.ativo, fields.imagem_id ?? null, url],
    )
    res.status(201).json({ data: publicProduct(await fetchProduct(pool, result.rows[0].id)) })
  })
  app.patch('/api/v1/minha-loja/produtos/:id', auth, async (req, res) => {
    const fields = validate(updateSchema, req.body)
    if (!z.uuid().safeParse(req.params.id).success) throw new HttpError(404, 'NAO_ENCONTRADO', 'Produto não encontrado.')
    const existing = await fetchProduct(pool, req.params.id)
    if (!existing || existing.vendedor_id !== req.session.usuario.id) {
      throw new HttpError(404, 'NAO_ENCONTRADO', 'Produto não encontrado.')
    }
    const imageId = fields.imagem_id === undefined ? existing.imagem_id : fields.imagem_id
    const url = fields.imagem_id === undefined ? existing.foto_url : await imageUrl(pool, imageId, existing.loja_id)
    const { rows } = await pool.query(
      `update produtos set nome = $1, descricao = $2, preco = $3, estoque = $4, ativo = $5,
       imagem_id = $6, foto_url = $7, versao = versao + 1
       where id = $8 and versao = $9 returning id`,
      [fields.nome ?? existing.nome, fields.descricao === undefined ? existing.descricao : fields.descricao,
        fields.preco ?? existing.preco, fields.estoque ?? existing.estoque, fields.ativo ?? existing.ativo,
        imageId, url, existing.id, fields.versao],
    )
    if (!rows.length) throw new HttpError(409, 'VERSAO_DESATUALIZADA', 'Produto alterado por outra operação. Recarregue a página.')
    res.json({ data: publicProduct(await fetchProduct(pool, existing.id)) })
  })
}
