import { HttpError } from '../../http/errors.js'
import { pagination, paged } from '../../http/pagination.js'
import { loadSession } from '../auth/sessions.js'
import { z } from 'zod'

export const productFields = `p.id, p.loja_id, p.imagem_id, p.nome, p.descricao, p.preco,
  p.foto_url, p.estoque, p.ativo, p.versao, p.criado_em,
  json_build_object('id', l.id, 'nome', l.nome, 'descricao', l.descricao, 'ativa', l.ativa) as loja`

function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&')
}

export async function fetchProduct(pool, id) {
  const result = await pool.query(
    `select ${productFields}, l.vendedor_id from produtos p join lojas l on l.id = p.loja_id where p.id = $1`, [id],
  )
  return result.rows[0] || null
}

export function publicProduct(row) {
  if (!row) return null
  const { vendedor_id, ...product } = row
  return product
}

export function registerCatalogRoutes(app, pool) {
  app.get('/api/v1/produtos', async (req, res) => {
    const { busca = '', lojaId = '' } = req.query
    if (typeof busca !== 'string' || busca.length > 120 || (lojaId && !z.uuid().safeParse(lojaId).success)) {
      throw new HttpError(400, 'ENTRADA_INVALIDA', 'Filtro inválido.')
    }
    const page = pagination(req.query)
    const params = [busca.trim() ? `%${escapeLike(busca.trim())}%` : null, lojaId || null]
    const where = `p.ativo = true and l.ativa = true and ($1::text is null or p.nome ilike $1 escape '\\')
      and ($2::uuid is null or p.loja_id = $2)`
    const total = await pool.query(`select count(*)::int as total from produtos p join lojas l on l.id = p.loja_id where ${where}`, params)
    const rows = await pool.query(
      `select ${productFields} from produtos p join lojas l on l.id = p.loja_id
       where ${where} order by p.criado_em desc, p.id desc limit $3 offset $4`, [...params, page.limit, page.offset],
    )
    paged(res, rows.rows.map(publicProduct), total.rows[0].total, page)
  })

  app.get('/api/v1/produtos/:id', async (req, res) => {
    if (!z.uuid().safeParse(req.params.id).success) throw new HttpError(404, 'NAO_ENCONTRADO', 'Produto não encontrado.')
    const product = await fetchProduct(pool, req.params.id)
    const session = await loadSession(req, pool)
    const visible = product && (
      (product.ativo && product.loja.ativa) || product.vendedor_id === session?.usuario.id || session?.perfil.administrador
    )
    if (!visible) throw new HttpError(404, 'NAO_ENCONTRADO', 'Produto não encontrado.')
    res.json({ data: publicProduct(product) })
  })

  app.get('/api/v1/lojas', async (req, res) => {
    const page = pagination(req.query)
    const count = await pool.query('select count(*)::int as total from lojas where ativa = true')
    const result = await pool.query(
      'select id, nome, descricao from lojas where ativa = true order by nome, id limit $1 offset $2',
      [page.limit, page.offset],
    )
    paged(res, result.rows, count.rows[0].total, page)
  })

  app.get('/api/v1/configuracoes/comissao', async (_req, res) => {
    const result = await pool.query('select percentual_comissao from configuracoes where id = 1')
    res.json({ data: result.rows[0] })
  })
}
