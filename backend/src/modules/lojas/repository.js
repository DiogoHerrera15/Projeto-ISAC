export async function ownStore(db, userId) {
  const { rows } = await db.query('select * from lojas where vendedor_id = $1', [userId])
  return rows[0] || null
}

export async function createStore(db, userId, fields) {
  const { rows } = await db.query(
    'insert into lojas(vendedor_id, nome, descricao) values ($1, $2, $3) returning *',
    [userId, fields.nome, fields.descricao ?? null],
  )
  return rows[0]
}

export async function updateStore(db, userId, existing, fields) {
  const result = await db.query(
    'update lojas set nome = $1, descricao = $2, ativa = $3 where id = $4 and vendedor_id = $5 returning *',
    [fields.nome ?? existing.nome, fields.descricao === undefined ? existing.descricao : fields.descricao,
      fields.ativa ?? existing.ativa, existing.id, userId],
  )
  return result.rows[0]
}

export async function listSales(db, userId, { limit, offset }) {
  const count = await db.query(
    `select count(*)::int as total from pedido_itens i join lojas l on l.id = i.loja_id
     where l.vendedor_id = $1`, [userId],
  )
  const { rows } = await db.query(
    `select i.pedido_id, p.criado_em, p.status, pf.nome as cliente_nome,
     pf.telefone as cliente_telefone, i.nome_produto as produto_nome,
     i.quantidade, i.subtotal, i.valor_comissao, i.valor_vendedor
     from pedido_itens i join lojas l on l.id = i.loja_id
     join pedidos p on p.id = i.pedido_id join perfis pf on pf.id = p.cliente_id
     where l.vendedor_id = $1 order by p.criado_em desc, i.id desc limit $2 offset $3`,
    [userId, limit, offset],
  )
  return { rows, total: count.rows[0].total }
}
