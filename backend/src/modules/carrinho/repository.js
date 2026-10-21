export async function getCart(db, userId) {
  const { rows } = await db.query(
    `select c.produto_id, c.quantidade,
      to_jsonb(p) || jsonb_build_object(
        'preco', p.preco::text,
        'loja', jsonb_build_object('id', l.id, 'nome', l.nome, 'descricao', l.descricao, 'ativa', l.ativa)
      ) as produto
     from carrinho_itens c join produtos p on p.id = c.produto_id
     join lojas l on l.id = p.loja_id
     where c.cliente_id = $1 order by c.adicionado_em, c.produto_id`,
    [userId],
  )
  return rows
}

export async function lockCustomer(db, userId) {
  const result = await db.query('select id from perfis where id = $1 for update', [userId])
  return result.rowCount > 0
}

export async function findAvailableProduct(db, productId) {
  const { rows } = await db.query(
    'select p.ativo, l.ativa as loja_ativa from produtos p join lojas l on l.id = p.loja_id where p.id = $1',
    [productId],
  )
  return rows[0] || null
}

export async function setQuantity(db, userId, productId, quantity) {
  const result = await db.query(
    `insert into carrinho_itens(cliente_id, produto_id, quantidade) values ($1, $2, $3)
     on conflict(cliente_id, produto_id) do update set quantidade = excluded.quantidade
     returning produto_id, quantidade`,
    [userId, productId, quantity],
  )
  return result.rows[0]
}

export async function removeItem(db, userId, productId) {
  await db.query('delete from carrinho_itens where cliente_id = $1 and produto_id = $2', [userId, productId])
}
