import { withTransaction } from '../../db/transaction.js'
import { HttpError } from '../../http/errors.js'
import { lockCustomer } from '../carrinho/service.js'
import { parseDinheiro, formatarDinheiro, parseTaxa, calcularItem } from '../../shared/dinheiro.js'
import * as repository from './repository.js'
import { getOrder } from './service.js'

export async function checkout(pool, userId, key) {
  return withTransaction(pool, async (client) => {
    await lockCustomer(client, userId)
    const previousId = await repository.findCheckoutByKey(client, userId, key)
    if (previousId) return { order: await getOrder(client, previousId), reused: true }

    const phone = await repository.customerPhone(client, userId)
    if (!/^\d{10,11}$/.test(phone || '')) {
      throw new HttpError(400, 'ENTRADA_INVALIDA', 'Informe um telefone com DDD para finalizar.')
    }
    const cart = await repository.lockCart(client, userId)
    if (!cart.length) throw new HttpError(409, 'CARRINHO_VAZIO', 'Seu carrinho está vazio.')

    const { stores, products } = await repository.lockStoresAndProducts(client, cart.map((item) => item.produto_id))
    const availableStores = new Map(stores.map((store) => [store.id, store.ativa]))
    const byId = new Map(products.map((product) => [product.id, product]))
    const percentage = await repository.commissionRate(client)
    if (percentage === null) throw new HttpError(500, 'ERRO_INTERNO', 'Taxa de comissão ausente.')
    const points = parseTaxa(percentage)

    let total = 0n
    let totalCommission = 0n
    const snapshots = []
    for (const item of cart) {
      const product = byId.get(item.produto_id)
      if (!product || !product.ativo || !availableStores.get(product.loja_id)) {
        throw new HttpError(409, 'PRODUTO_INDISPONIVEL', 'Um produto ou loja não está mais disponível.')
      }
      if (product.estoque < item.quantidade) {
        throw new HttpError(409, 'ESTOQUE_INSUFICIENTE', `Estoque insuficiente para ${product.nome}.`)
      }
      let values
      try {
        values = calcularItem(parseDinheiro(product.preco), item.quantidade, points)
      } catch (error) {
        if (error.message === 'Valor monetário excede o limite') {
          throw new HttpError(400, 'ENTRADA_INVALIDA', 'O valor do pedido excede o limite.')
        }
        throw error
      }
      snapshots.push({ product, quantidade: item.quantidade, values })
      total += values.subtotal
      totalCommission += values.comissao
    }

    let totalValue
    let commissionValue
    let sellerValue
    try {
      totalValue = formatarDinheiro(total)
      commissionValue = formatarDinheiro(totalCommission)
      sellerValue = formatarDinheiro(total - totalCommission)
    } catch {
      throw new HttpError(400, 'ENTRADA_INVALIDA', 'O valor do pedido excede o limite.')
    }
    const orderId = await repository.createOrder(client, userId, key, totalValue, commissionValue, sellerValue)
    for (const { product, quantidade, values } of snapshots) {
      await repository.addOrderItem(client, orderId, product, quantidade, {
        subtotal: formatarDinheiro(values.subtotal),
        comissao: formatarDinheiro(values.comissao),
        vendedor: formatarDinheiro(values.vendedor),
      }, percentage)
      await repository.decrementStock(client, product.id, quantidade)
    }
    await repository.clearCart(client, userId)
    return { order: await getOrder(client, orderId), reused: false }
  })
}
