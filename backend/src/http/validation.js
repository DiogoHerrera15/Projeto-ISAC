import { HttpError } from './errors.js'

export function validate(schema, input) {
  const result = schema.safeParse(input)
  if (!result.success) {
    const details = result.error.issues.map(({ path, message }) => ({ field: path.join('.'), message }))
    throw new HttpError(400, 'ENTRADA_INVALIDA', 'Revise os dados informados.', { fields: details })
  }
  return result.data
}

export function normalizePhone(value) {
  if (value == null || value === '') return null
  const digits = String(value).replace(/\D/g, '')
  if (!/^\d{10,11}$/.test(digits)) throw new HttpError(400, 'ENTRADA_INVALIDA', 'Informe um telefone com DDD.')
  return digits
}
