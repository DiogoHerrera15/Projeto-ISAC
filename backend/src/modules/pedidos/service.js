import { HttpError } from '../../http/errors.js'
import { formatarDinheiro, parseDinheiro } from '../../shared/dinheiro.js'
import { ownStore } from '../lojas/service.js'
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

function sum(items, field) {
  return formatarDinheiro(items.reduce((total, item) => total + parseDinheiro(item[field]), 0n))
}

// Cliente e administração veem o pedido inteiro. A vendedora vê só os itens da
// sua loja, com os totais recalculados sobre eles. Os demais recebem 404.
export async function getOrderFor(db, id, session) {
  const order = await getOrder(db, id, true)
  if (!order) throw new HttpError(404, 'NAO_ENCONTRADO', 'Pedido não encontrado.')
  if (order.cliente_id === session.usuario.id) return { ...order, visao: 'cliente' }
  if (session.perfil.administrador) return { ...order, visao: 'admin' }
  const store = await ownStore(db, session.usuario.id)
  const items = store ? order.itens.filter((item) => item.loja_id === store.id) : []
  if (!items.length) throw new HttpError(404, 'NAO_ENCONTRADO', 'Pedido não encontrado.')
  return {
    ...order,
    itens: items,
    valor_total: sum(items, 'subtotal'),
    comissao_isac: sum(items, 'valor_comissao'),
    valor_vendedores: sum(items, 'valor_vendedor'),
    visao: 'vendedor',
  }
}
