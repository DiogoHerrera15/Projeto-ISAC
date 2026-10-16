import { withTransaction } from '../../db/transaction.js'
import { HttpError } from '../../http/errors.js'
import { lockCustomer } from '../carrinho/service.js'
import { parseDinheiro, formatarDinheiro, parseTaxa, calcularItem } from '../../shared/dinheiro.js'
import { fetchOrder } from './repository.js'

export async function checkout(pool, userId, key) {
  return withTransaction(pool, async (client) => {
    await lockCustomer(client, userId)
    const previous = await client.query(
      'select id from pedidos where cliente_id = $1 and chave_checkout = $2', [userId, key],
    )
    if (previous.rows.length) return { order: await fetchOrder(client, previous.rows[0].id), reused: true }

    const { rows: profiles } = await client.query('select telefone from perfis where id = $1', [userId])
    if (!/^\d{10,11}$/.test(profiles[0]?.telefone || '')) {
      throw new HttpError(400, 'ENTRADA_INVALIDA', 'Informe um telefone com DDD para finalizar.')
    }
    const { rows: cart } = await client.query(
      'select produto_id, quantidade from carrinho_itens where cliente_id = $1 order by produto_id for update',
      [userId],
    )
    if (!cart.length) throw new HttpError(409, 'CARRINHO_VAZIO', 'Seu carrinho está vazio.')
    const productIds = cart.map((item) => item.produto_id)
    const storeIds = await client.query('select distinct loja_id from produtos where id = any($1::uuid[])', [productIds])
    const stores = await client.query(
      'select id, ativa from lojas where id = any($1::uuid[]) order by id for update',
      [storeIds.rows.map((row) => row.loja_id)],
    )
    const availableStores = new Map(stores.rows.map((store) => [store.id, store.ativa]))
    const products = await client.query(
      'select id, loja_id, nome, preco, estoque, ativo from produtos where id = any($1::uuid[]) order by id for update',
      [productIds],
    )
    const byId = new Map(products.rows.map((product) => [product.id, product]))
    const rate = await client.query('select percentual_comissao from configuracoes where id = 1')
    if (!rate.rows.length) throw new HttpError(500, 'ERRO_INTERNO', 'Taxa de comissão ausente.')
    const percentage = rate.rows[0].percentual_comissao
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
    const created = await client.query(
      `insert into pedidos(cliente_id, chave_checkout, valor_total, comissao_isac, valor_vendedores)
       values ($1, $2, $3, $4, $5) returning id`,
      [userId, key, totalValue, commissionValue, sellerValue],
    )
    const orderId = created.rows[0].id
    for (const item of snapshots) {
      const { product, quantidade, values } = item
      await client.query(
        `insert into pedido_itens(pedido_id, produto_id, loja_id, nome_produto, quantidade,
         preco_unitario, subtotal, percentual_comissao, valor_comissao, valor_vendedor)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [orderId, product.id, product.loja_id, product.nome, quantidade, product.preco,
          formatarDinheiro(values.subtotal), percentage, formatarDinheiro(values.comissao), formatarDinheiro(values.vendedor)],
      )
      await client.query('update produtos set estoque = estoque - $1, versao = versao + 1 where id = $2', [quantidade, product.id])
    }
    await client.query('delete from carrinho_itens where cliente_id = $1', [userId])
    return { order: await fetchOrder(client, orderId), reused: false }
  })
}
