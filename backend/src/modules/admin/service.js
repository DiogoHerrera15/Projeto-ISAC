import { HttpError } from '../../http/errors.js'
import { parseTaxa } from '../../shared/dinheiro.js'
import { listOrders as listAllOrders } from '../pedidos/service.js'
import { confirmOrder } from '../pedidos/transicoes.js'
import * as repository from './repository.js'

export const listStores = repository.listStores
export const listProducts = repository.listProducts
export { confirmOrder }

export async function listOrders(db, page) {
  return listAllOrders(db, page, { admin: true })
}

export async function updateStore(db, id, active) {
  const store = await repository.updateStore(db, id, active)
  if (!store) throw new HttpError(404, 'NAO_ENCONTRADO', 'Loja não encontrada.')
  return store
}

export async function updateProduct(db, id, active, version) {
  const updated = await repository.updateProduct(db, id, active, version)
  if (updated) return updated
  const exists = await repository.productExists(db, id)
  throw new HttpError(exists ? 409 : 404, exists ? 'VERSAO_DESATUALIZADA' : 'NAO_ENCONTRADO',
    exists ? 'Produto alterado por outra operação.' : 'Produto não encontrado.')
}

export async function updateCommission(db, rate) {
  try { parseTaxa(rate) } catch { throw new HttpError(400, 'ENTRADA_INVALIDA', 'Taxa inválida.') }
  return repository.updateCommission(db, rate)
}
