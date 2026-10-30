import { HttpError } from '../../http/errors.js'
import { ownStore } from '../lojas/service.js'
import { categoryExists, fetchProduct } from '../catalogo/repository.js'
import { publicProduct } from '../catalogo/service.js'
import * as repository from './repository.js'

async function imageUrl(db, imageId, storeId) {
  if (!imageId) return null
  if (!(await repository.imageBelongsToStore(db, imageId, storeId))) {
    throw new HttpError(404, 'NAO_ENCONTRADO', 'Imagem não encontrada nesta loja.')
  }
  return `/api/v1/imagens/${imageId}`
}

async function checkCategory(db, categoryId) {
  if (categoryId && !(await categoryExists(db, categoryId))) {
    throw new HttpError(400, 'ENTRADA_INVALIDA', 'Categoria inválida.', { fields: [{ field: 'categoria_id', message: 'Categoria inexistente' }] })
  }
}

export async function listOwnProducts(db, userId, page) {
  const store = await ownStore(db, userId)
  if (!store) throw new HttpError(404, 'NAO_ENCONTRADO', 'Loja não encontrada.')
  return repository.listOwnProducts(db, store.id, page)
}

export async function createProduct(db, userId, fields) {
  const store = await ownStore(db, userId)
  if (!store) throw new HttpError(404, 'NAO_ENCONTRADO', 'Loja não encontrada.')
  await checkCategory(db, fields.categoria_id)
  const url = await imageUrl(db, fields.imagem_id, store.id)
  const id = await repository.createProduct(db, store.id, fields, url)
  return publicProduct(await fetchProduct(db, id))
}

export async function updateProduct(db, userId, id, fields) {
  const existing = await fetchProduct(db, id)
  if (!existing || existing.vendedor_id !== userId) {
    throw new HttpError(404, 'NAO_ENCONTRADO', 'Produto não encontrado.')
  }
  await checkCategory(db, fields.categoria_id)
  const imageId = fields.imagem_id === undefined ? existing.imagem_id : fields.imagem_id
  const url = fields.imagem_id === undefined ? existing.foto_url : await imageUrl(db, imageId, existing.loja_id)
  const updated = await repository.updateProduct(db, existing, fields, imageId, url)
  if (!updated) throw new HttpError(409, 'VERSAO_DESATUALIZADA', 'Produto alterado por outra operação. Recarregue a página.')
  return publicProduct(await fetchProduct(db, existing.id))
}
