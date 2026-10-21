export async function fetchOrder(db, orderId) {
  const result = await db.query(
    `select p.*, pf.nome as cliente_nome, pf.telefone as cliente_telefone
     from pedidos p join perfis pf on pf.id = p.cliente_id where p.id = $1`, [orderId],
  )
  if (!result.rows.length) return null
  const items = await db.query(
    `select i.*, json_build_object('id', l.id, 'nome', l.nome) as loja
     from pedido_itens i join lojas l on l.id = i.loja_id
     where i.pedido_id = $1 order by i.id`, [orderId],
  )
  return { ...result.rows[0], itens: items.rows }
}

export async function listOrderIds(db, customerId, { limit, offset }) {
  const where = customerId ? 'where cliente_id = $1' : ''
  const args = customerId ? [customerId] : []
  const count = await db.query(`select count(*)::int as total from pedidos ${where}`, args)
  const ids = await db.query(
    `select id from pedidos ${where} order by criado_em desc, id desc limit $${args.length + 1} offset $${args.length + 2}`,
    [...args, limit, offset],
  )
  return { ids: ids.rows.map((row) => row.id), total: count.rows[0].total }
}

export async function findCheckoutByKey(db, userId, key) {
  const { rows } = await db.query('select id from pedidos where cliente_id = $1 and chave_checkout = $2', [userId, key])
  return rows[0]?.id || null
}

export async function customerPhone(db, userId) {
  const { rows } = await db.query('select telefone from perfis where id = $1', [userId])
  return rows[0]?.telefone || null
}

export async function lockCart(db, userId) {
  const { rows } = await db.query(
    'select produto_id, quantidade from carrinho_itens where cliente_id = $1 order by produto_id for update', [userId],
  )
  return rows
}

export async function lockStoresAndProducts(db, productIds) {
  const storeIds = await db.query('select distinct loja_id from produtos where id = any($1::uuid[])', [productIds])
  const stores = await db.query(
    'select id, ativa from lojas where id = any($1::uuid[]) order by id for update',
    [storeIds.rows.map((row) => row.loja_id)],
  )
  const products = await db.query(
    'select id, loja_id, nome, preco, estoque, ativo from produtos where id = any($1::uuid[]) order by id for update',
    [productIds],
  )
  return { stores: stores.rows, products: products.rows }
}

export async function commissionRate(db) {
  const { rows } = await db.query('select percentual_comissao from configuracoes where id = 1')
  return rows[0]?.percentual_comissao || null
}

export async function createOrder(db, userId, key, total, commission, seller) {
  const { rows } = await db.query(
    `insert into pedidos(cliente_id, chave_checkout, valor_total, comissao_isac, valor_vendedores)
     values ($1, $2, $3, $4, $5) returning id`,
    [userId, key, total, commission, seller],
  )
  return rows[0].id
}

export async function addOrderItem(db, orderId, product, quantity, values, percentage) {
  await db.query(
    `insert into pedido_itens(pedido_id, produto_id, loja_id, nome_produto, quantidade,
     preco_unitario, subtotal, percentual_comissao, valor_comissao, valor_vendedor)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [orderId, product.id, product.loja_id, product.nome, quantity, product.preco,
      values.subtotal, percentage, values.comissao, values.vendedor],
  )
}

export async function decrementStock(db, productId, quantity) {
  await db.query('update produtos set estoque = estoque - $1, versao = versao + 1 where id = $2', [quantity, productId])
}

export async function clearCart(db, userId) {
  await db.query('delete from carrinho_itens where cliente_id = $1', [userId])
}

export async function lockOrder(db, orderId) {
  const { rows } = await db.query('select * from pedidos where id = $1 for update', [orderId])
  return rows[0] || null
}

export async function orderItemsForRestock(db, orderId) {
  const { rows } = await db.query(
    'select produto_id, quantidade from pedido_itens where pedido_id = $1 order by produto_id', [orderId],
  )
  return rows
}

export async function lockProductsForRestock(db, ids) {
  await db.query('select id from produtos where id = any($1::uuid[]) order by id for update', [ids])
}

export async function incrementStock(db, productId, quantity) {
  await db.query('update produtos set estoque = estoque + $1, versao = versao + 1 where id = $2', [quantity, productId])
}

export async function markCancelled(db, orderId) {
  await db.query("update pedidos set status = 'cancelado' where id = $1", [orderId])
}

export async function markConfirmed(db, orderId) {
  await db.query("update pedidos set status = 'confirmado', confirmado_em = now() where id = $1", [orderId])
}
