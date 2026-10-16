import { HttpError } from './errors.js'

export function pagination(query) {
  const page = query.pagina === undefined ? 1 : Number(query.pagina)
  const limit = query.limite === undefined ? 20 : Number(query.limite)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new HttpError(400, 'ENTRADA_INVALIDA', 'Paginação inválida.')
  }
  return { page, limit, offset: (page - 1) * limit }
}

export function paged(res, rows, total, { page, limit }) {
  res.json({ data: rows, meta: { pagina: page, limite: limit, total: Number(total) } })
}
