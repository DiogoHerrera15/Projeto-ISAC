import { withTransaction } from '../../db/transaction.js'
import { HttpError } from '../../http/errors.js'

export async function lockCustomer(client, userId) {
  const result = await client.query('select id from perfis where id = $1 for update', [userId])
  if (!result.rowCount) throw new HttpError(401, 'NAO_AUTENTICADO', 'Conta não encontrada.')
}

export async function setQuantity(pool, userId, productId, quantity) {
  return withTransaction(pool, async (client) => {
    await lockCustomer(client, userId)
    const { rows } = await client.query(
      `select p.ativo, l.ativa as loja_ativa from produtos p join lojas l on l.id = p.loja_id where p.id = $1`,
      [productId],
    )
    if (!rows.length || !rows[0].ativo || !rows[0].loja_ativa) {
      throw new HttpError(409, 'PRODUTO_INDISPONIVEL', 'Produto ou loja indisponível.')
    }
    const result = await client.query(
      `insert into carrinho_itens(cliente_id, produto_id, quantidade) values ($1, $2, $3)
       on conflict(cliente_id, produto_id) do update set quantidade = excluded.quantidade
       returning produto_id, quantidade`,
      [userId, productId, quantity],
    )
    return result.rows[0]
  })
}

export async function removeItem(pool, userId, productId) {
  await withTransaction(pool, async (client) => {
    await lockCustomer(client, userId)
    await client.query('delete from carrinho_itens where cliente_id = $1 and produto_id = $2', [userId, productId])
  })
}
