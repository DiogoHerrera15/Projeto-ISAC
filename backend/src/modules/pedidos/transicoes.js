import { withTransaction } from '../../db/transaction.js'
import { HttpError } from '../../http/errors.js'
import { fetchOrder } from './repository.js'

export async function cancelOrder(pool, orderId, actor) {
  return withTransaction(pool, async (client) => {
    const { rows } = await client.query('select * from pedidos where id = $1 for update', [orderId])
    const order = rows[0]
    if (!order || (order.cliente_id !== actor.usuario.id && !actor.perfil.administrador)) {
      throw new HttpError(404, 'NAO_ENCONTRADO', 'Pedido não encontrado.')
    }
    if (order.status !== 'pendente') {
      throw new HttpError(409, 'ESTADO_PEDIDO_INVALIDO', 'Apenas pedidos pendentes podem ser cancelados.')
    }
    const items = await client.query(
      'select produto_id, quantidade from pedido_itens where pedido_id = $1 order by produto_id', [orderId],
    )
    await client.query(
      'select id from produtos where id = any($1::uuid[]) order by id for update',
      [items.rows.map((item) => item.produto_id)],
    )
    for (const item of items.rows) {
      await client.query('update produtos set estoque = estoque + $1, versao = versao + 1 where id = $2',
        [item.quantidade, item.produto_id])
    }
    await client.query("update pedidos set status = 'cancelado' where id = $1", [orderId])
    return fetchOrder(client, orderId, actor.perfil.administrador)
  })
}

export async function confirmOrder(pool, orderId) {
  return withTransaction(pool, async (client) => {
    const { rows } = await client.query('select status from pedidos where id = $1 for update', [orderId])
    if (!rows.length) throw new HttpError(404, 'NAO_ENCONTRADO', 'Pedido não encontrado.')
    if (rows[0].status !== 'pendente') {
      throw new HttpError(409, 'ESTADO_PEDIDO_INVALIDO', 'O pedido não está pendente.')
    }
    await client.query("update pedidos set status = 'confirmado', confirmado_em = now() where id = $1", [orderId])
    return fetchOrder(client, orderId, true)
  })
}
