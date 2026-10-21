import { HttpError } from '../../http/errors.js'
import * as repository from './repository.js'

export const ownStore = repository.ownStore
export const listSales = repository.listSales

export async function createStore(db, userId, fields) {
  try {
    return await repository.createStore(db, userId, fields)
  } catch (error) {
    if (error.code === '23505') throw new HttpError(409, 'LOJA_JA_EXISTE', 'Você já possui uma loja.')
    throw error
  }
}

export async function updateStore(db, userId, fields) {
  const existing = await repository.ownStore(db, userId)
  if (!existing) throw new HttpError(404, 'NAO_ENCONTRADO', 'Loja não encontrada.')
  return repository.updateStore(db, userId, existing, fields)
}
