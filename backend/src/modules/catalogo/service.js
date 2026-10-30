import { HttpError } from '../../http/errors.js'
import * as repository from './repository.js'

export function publicProduct(row) {
  if (!row) return null
  const { vendedor_id, ...product } = row
  return product
}

export async function getVisibleProduct(db, id, session) {
  const product = await repository.fetchProduct(db, id)
  const visible = product && (
    (product.ativo && product.loja.ativa) || product.vendedor_id === session?.usuario.id || session?.perfil.administrador
  )
  if (!visible) throw new HttpError(404, 'NAO_ENCONTRADO', 'Produto não encontrado.')
  return publicProduct(product)
}

export async function listProducts(db, filters) {
  const result = await repository.listProducts(db, filters)
  return { ...result, rows: result.rows.map(publicProduct) }
}

export const listStores = repository.listStores
export const listCategories = repository.listCategories
export const getCommission = repository.getCommission
