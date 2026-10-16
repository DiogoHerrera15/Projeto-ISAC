import { requireSession } from '../auth/sessions.js'
import { pagination, paged } from '../../http/pagination.js'

export function registerSalesRoutes(app, pool) {
  app.get('/api/v1/minha-loja/vendas', requireSession(pool), async (req, res) => {
    const page = pagination(req.query)
    const userId = req.session.usuario.id
    const count = await pool.query(
      `select count(*)::int as total from pedido_itens i join lojas l on l.id = i.loja_id
       where l.vendedor_id = $1`, [userId],
    )
    const { rows } = await pool.query(
      `select i.pedido_id, p.criado_em, p.status, pf.nome as cliente_nome,
       pf.telefone as cliente_telefone, i.nome_produto as produto_nome,
       i.quantidade, i.subtotal, i.valor_comissao, i.valor_vendedor
       from pedido_itens i join lojas l on l.id = i.loja_id
       join pedidos p on p.id = i.pedido_id join perfis pf on pf.id = p.cliente_id
       where l.vendedor_id = $1 order by p.criado_em desc, i.id desc limit $2 offset $3`,
      [userId, page.limit, page.offset],
    )
    paged(res, rows, count.rows[0].total, page)
  })
}
