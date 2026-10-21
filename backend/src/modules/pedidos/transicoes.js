import { withTransaction } from '../../db/transaction.js'
import { HttpError } from '../../http/errors.js'
import * as repository from './repository.js'
import { getOrder } from './service.js'

export async function cancelOrder(pool, orderId, actor) {
  return withTransaction(pool, async (client) => {
    const order = await repository.lockOrder(client, orderId)
    if (!order || (order.cliente_id !== actor.usuario.id && !actor.perfil.administrador)) {
      throw new HttpError(404, 'NAO_ENCONTRADO', 'Pedido não encontrado.')
    }
    if (order.status !== 'pendente') {
      throw new HttpError(409, 'ESTADO_PEDIDO_INVALIDO', 'Apenas pedidos pendentes podem ser cancelados.')
    }
    const items = await repository.orderItemsForRestock(client, orderId)
    await repository.lockProductsForRestock(client, items.map((item) => item.produto_id))
    for (const item of items) await repository.incrementStock(client, item.produto_id, item.quantidade)
    await repository.markCancelled(client, orderId)
    return getOrder(client, orderId, actor.perfil.administrador)
  })
}

export async function confirmOrder(pool, orderId) {
  return withTransaction(pool, async (client) => {
    const order = await repository.lockOrder(client, orderId)
    if (!order) throw new HttpError(404, 'NAO_ENCONTRADO', 'Pedido não encontrado.')
    if (order.status !== 'pendente') {
      throw new HttpError(409, 'ESTADO_PEDIDO_INVALIDO', 'O pedido não está pendente.')
    }
    await repository.markConfirmed(client, orderId)
    return getOrder(client, orderId, true)
  })
}
