import { HttpError } from '../../http/errors.js'
import { formatarDinheiro, parseDinheiro } from '../../shared/dinheiro.js'
import { ownStore } from '../lojas/service.js'
import * as repository from './repository.js'

function presentOrder(row, includeCustomer) {
  const { cliente_nome, cliente_telefone, ...order } = row
  return {
    ...order,
    cliente: includeCustomer ? { nome: cliente_nome, telefone: cliente_telefone } : null,
  }
}

export async function getOrder(db, id, includeCustomer = false) {
  const row = await repository.fetchOrder(db, id)
  return row ? presentOrder(row, includeCustomer) : null
}

export async function listOrders(db, page, { customerId = null, admin = false } = {}) {
  const result = await repository.listOrderIds(db, customerId, page)
  const fetched = await repository.fetchOrders(db, result.ids)
  const byId = new Map(fetched.map((row) => [row.id, row]))
  // Mantém a ordem da página (mais recentes primeiro); um pedido que sumiu no meio do caminho é ignorado.
  const rows = result.ids.filter((id) => byId.has(id)).map((id) => presentOrder(byId.get(id), admin))
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
