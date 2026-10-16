import { z } from 'zod'
import { validate } from '../../http/validation.js'
import { HttpError } from '../../http/errors.js'
import { pagination, paged } from '../../http/pagination.js'
import { requireSession, requireAdmin } from '../auth/sessions.js'
import { productFields } from '../catalogo/routes.js'
import { parseTaxa } from '../../shared/dinheiro.js'
import { listOrders } from '../pedidos/repository.js'
import { confirmOrder } from '../pedidos/transicoes.js'

const flagStore = z.object({ ativa: z.boolean() }).strict()
const flagProduct = z.object({ ativo: z.boolean(), versao: z.number().int().min(1) }).strict()
const rateSchema = z.object({ percentual_comissao: z.string() }).strict()

export function registerAdminRoutes(app, pool) {
  const auth = [requireSession(pool), requireAdmin]
  app.get('/api/v1/admin/pedidos', ...auth, async (req, res) => {
    await listOrders(pool, res, req, { admin: true })
  })
  app.post('/api/v1/admin/pedidos/:id/confirmacao', ...auth, async (req, res) => {
    if (!z.uuid().safeParse(req.params.id).success) throw new HttpError(404, 'NAO_ENCONTRADO', 'Pedido não encontrado.')
    res.json({ data: await confirmOrder(pool, req.params.id) })
  })
  app.get('/api/v1/admin/lojas', ...auth, async (req, res) => {
    const page = pagination(req.query)
    const count = await pool.query('select count(*)::int as total from lojas')
    const result = await pool.query(
      `select l.*, json_build_object('nome', pf.nome, 'telefone', pf.telefone) as vendedor,
       count(p.id)::int as total_produtos
       from lojas l join perfis pf on pf.id = l.vendedor_id
       left join produtos p on p.loja_id = l.id
       group by l.id, pf.id order by l.nome, l.id limit $1 offset $2`, [page.limit, page.offset],
    )
    paged(res, result.rows, count.rows[0].total, page)
  })
  app.patch('/api/v1/admin/lojas/:id', ...auth, async (req, res) => {
    if (!z.uuid().safeParse(req.params.id).success) throw new HttpError(404, 'NAO_ENCONTRADO', 'Loja não encontrada.')
    const { ativa } = validate(flagStore, req.body)
    const { rows } = await pool.query('update lojas set ativa = $1 where id = $2 returning *', [ativa, req.params.id])
    if (!rows.length) throw new HttpError(404, 'NAO_ENCONTRADO', 'Loja não encontrada.')
    res.json({ data: rows[0] })
  })
  app.get('/api/v1/admin/produtos', ...auth, async (req, res) => {
    const page = pagination(req.query)
    const count = await pool.query('select count(*)::int as total from produtos')
    const result = await pool.query(
      `select ${productFields} from produtos p join lojas l on l.id = p.loja_id
       order by p.nome, p.id limit $1 offset $2`, [page.limit, page.offset],
    )
    paged(res, result.rows, count.rows[0].total, page)
  })
  app.patch('/api/v1/admin/produtos/:id', ...auth, async (req, res) => {
    if (!z.uuid().safeParse(req.params.id).success) throw new HttpError(404, 'NAO_ENCONTRADO', 'Produto não encontrado.')
    const { ativo, versao } = validate(flagProduct, req.body)
    const { rows } = await pool.query(
      'update produtos set ativo = $1, versao = versao + 1 where id = $2 and versao = $3 returning id',
      [ativo, req.params.id, versao],
    )
    if (!rows.length) {
      const exists = await pool.query('select id from produtos where id = $1', [req.params.id])
      throw new HttpError(exists.rows.length ? 409 : 404, exists.rows.length ? 'VERSAO_DESATUALIZADA' : 'NAO_ENCONTRADO',
        exists.rows.length ? 'Produto alterado por outra operação.' : 'Produto não encontrado.')
    }
    const updated = await pool.query(
      `select ${productFields} from produtos p join lojas l on l.id = p.loja_id where p.id = $1`, [req.params.id],
    )
    res.json({ data: updated.rows[0] })
  })
  app.patch('/api/v1/admin/configuracoes/comissao', ...auth, async (req, res) => {
    const { percentual_comissao } = validate(rateSchema, req.body)
    try { parseTaxa(percentual_comissao) } catch { throw new HttpError(400, 'ENTRADA_INVALIDA', 'Taxa inválida.') }
    const { rows } = await pool.query(
      'update configuracoes set percentual_comissao = $1 where id = 1 returning percentual_comissao',
      [percentual_comissao],
    )
    res.json({ data: rows[0] })
  })
}
