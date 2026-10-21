import { HttpError } from '../../http/errors.js'
import { ownStore } from '../lojas/service.js'
import { inspectImage, removeImage } from '../../storage/local.js'
import * as repository from './repository.js'

export async function requireStore(db, userId) {
  const store = await ownStore(db, userId)
  if (!store) throw new HttpError(404, 'NAO_ENCONTRADO', 'Loja não encontrada.')
  return store
}

export async function saveImage(db, directory, storeId, file) {
  try {
    const detected = await inspectImage(file.path)
    if (detected !== file.mimetype) {
      throw new HttpError(415, 'FORMATO_NAO_SUPORTADO', 'O arquivo não é uma imagem válida.')
    }
    const id = await repository.createImage(db, storeId, file.filename, detected, file.size)
    return { id, foto_url: `/api/v1/imagens/${id}` }
  } catch (error) {
    await removeImage(directory, file.filename)
    throw error
  }
}

export async function getImage(db, id) {
  const image = await repository.findImage(db, id)
  if (!image) throw new HttpError(404, 'NAO_ENCONTRADO', 'Imagem não encontrada.')
  return image
}

export async function cleanOrphanImages(db, directory) {
  const keys = await repository.deleteOrphanImages(db)
  for (const key of keys) await removeImage(directory, key)
  return keys.length
}
