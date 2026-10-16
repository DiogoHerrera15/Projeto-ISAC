import { pagination, paged } from '../../http/pagination.js'

export async function fetchOrder(db, orderId, includeCustomer = false) {
  const result = await db.query(
    `select p.*, pf.nome as cliente_nome, pf.telefone as cliente_telefone
     from pedidos p join perfis pf on pf.id = p.cliente_id where p.id = $1`, [orderId],
  )
  if (!result.rows.length) return null
  const { cliente_nome, cliente_telefone, ...order } = result.rows[0]
  const items = await db.query(
    `select i.*, json_build_object('id', l.id, 'nome', l.nome) as loja
     from pedido_itens i join lojas l on l.id = i.loja_id
     where i.pedido_id = $1 order by i.id`, [orderId],
  )
  return {
    ...order,
    cliente: includeCustomer ? { nome: cliente_nome, telefone: cliente_telefone } : null,
    itens: items.rows,
  }
}

export async function listOrders(db, res, req, { customerId = null, admin = false } = {}) {
  const page = pagination(req.query)
  const where = customerId ? 'where cliente_id = $1' : ''
  const args = customerId ? [customerId] : []
  const count = await db.query(`select count(*)::int as total from pedidos ${where}`, args)
  const ids = await db.query(
    `select id from pedidos ${where} order by criado_em desc, id desc limit $${args.length + 1} offset $${args.length + 2}`,
    [...args, page.limit, page.offset],
  )
  const orders = await Promise.all(ids.rows.map(({ id }) => fetchOrder(db, id, admin)))
  paged(res, orders, count.rows[0].total, page)
}
