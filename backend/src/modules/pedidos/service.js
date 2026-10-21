import * as repository from './repository.js'

export async function getOrder(db, id, includeCustomer = false) {
  const row = await repository.fetchOrder(db, id)
  if (!row) return null
  const { cliente_nome, cliente_telefone, ...order } = row
  return {
    ...order,
    cliente: includeCustomer ? { nome: cliente_nome, telefone: cliente_telefone } : null,
  }
}

export async function listOrders(db, page, { customerId = null, admin = false } = {}) {
  const result = await repository.listOrderIds(db, customerId, page)
  const rows = await Promise.all(result.ids.map((id) => getOrder(db, id, admin)))
  return { rows, total: result.total }
}
