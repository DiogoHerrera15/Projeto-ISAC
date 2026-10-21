import { withTransaction } from '../../db/transaction.js'
import { HttpError } from '../../http/errors.js'
import * as repository from './repository.js'

export const getCart = repository.getCart

export async function lockCustomer(db, userId) {
  if (!(await repository.lockCustomer(db, userId))) {
    throw new HttpError(401, 'NAO_AUTENTICADO', 'Conta não encontrada.')
  }
}

export async function setQuantity(pool, userId, productId, quantity) {
  return withTransaction(pool, async (client) => {
    await lockCustomer(client, userId)
    const product = await repository.findAvailableProduct(client, productId)
    if (!product || !product.ativo || !product.loja_ativa) {
      throw new HttpError(409, 'PRODUTO_INDISPONIVEL', 'Produto ou loja indisponível.')
    }
    return repository.setQuantity(client, userId, productId, quantity)
  })
}

export async function removeItem(pool, userId, productId) {
  await withTransaction(pool, async (client) => {
    await lockCustomer(client, userId)
    await repository.removeItem(client, userId, productId)
  })
}
