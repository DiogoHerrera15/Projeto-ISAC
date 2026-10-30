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

const TIME_ZONE = 'America/Recife'
const UNITS = { dia: 'day', semana: 'week', mes: 'month' }
const MAX_PERIODS = 400

function periodCount(from, to, grouping) {
  const [a, b] = [new Date(`${from}T00:00:00Z`), new Date(`${to}T00:00:00Z`)]
  const days = Math.round((b - a) / 86400000) + 1
  if (grouping === 'dia') return days
  if (grouping === 'semana') return Math.ceil(days / 7) + 1
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth() + 1
}

export async function salesReport(db, { de = null, ate = null, agrupar = 'dia' }) {
  if (de && ate && de > ate) throw new HttpError(400, 'ENTRADA_INVALIDA', 'A data inicial deve ser anterior à final.')
  const bounds = de && ate ? {} : await repository.salesBounds(db, TIME_ZONE)
  const from = de || bounds.de
  const to = ate || bounds.ate
  if (from && to && from <= to && periodCount(from, to, agrupar) > MAX_PERIODS) {
    throw new HttpError(400, 'ENTRADA_INVALIDA', 'Período muito longo para esse agrupamento. Agrupe por semana ou mês.')
  }
  const filters = { timeZone: TIME_ZONE, from: de, to: ate }
  const [totais, porLoja] = await Promise.all([repository.salesTotals(db, filters), repository.salesByStore(db, filters)])
  const porPeriodo = from && to && from <= to
    ? await repository.salesByPeriod(db, { timeZone: TIME_ZONE, from, to, unit: UNITS[agrupar] })
    : []
  return { de, ate, agrupar, totais, por_periodo: porPeriodo, por_loja: porLoja }
}
