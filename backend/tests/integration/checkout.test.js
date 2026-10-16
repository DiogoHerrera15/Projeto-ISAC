import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { criarCenario } from '../helpers/cenario.js'

async function add(c, id, quantity = 1, role = 'cliente') {
  await c.como(role).put(`/api/v1/carrinho/itens/${id}`).send({ quantidade: quantity }).expect(200)
}

test('compra multiloja preserva preços e comissões por item', async (t) => {
  const c = await criarCenario(t)
  await add(c, c.ids.produtoA)
  await add(c, c.ids.produtoB)
  const bought = await c.como('cliente').post('/api/v1/pedidos')
    .set('Idempotency-Key', randomUUID()).send({}).expect(201)
  assert.equal(bought.body.data.status, 'pendente')
  assert.equal(bought.body.data.valor_total, '100.00')
  assert.equal(bought.body.data.comissao_isac, '5.00')
  assert.equal(bought.body.data.valor_vendedores, '95.00')
  assert.equal(bought.body.data.itens.length, 2)
  assert.deepEqual(new Set(bought.body.data.itens.map((i) => i.loja_id)), new Set([c.ids.lojaA, c.ids.lojaB]))
  const cart = await c.como('cliente').get('/api/v1/carrinho').expect(200)
  assert.deepEqual(cart.body.data, [])
  const stock = await c.consultar('select estoque from produtos where id = any($1::uuid[])', [[c.ids.produtoA, c.ids.produtoB]])
  assert.deepEqual(stock.rows.map((r) => r.estoque), [1, 1])
  await c.consultar("update produtos set nome = 'Nome novo', preco = 100.00 where id = $1", [c.ids.produtoA])
  const orders = await c.como('cliente').get('/api/v1/pedidos').expect(200)
  assert.equal(orders.body.data[0].itens.find((i) => i.produto_id === c.ids.produtoA).nome_produto, 'Produto A')
})

test('chave idempotente recupera pedido sem segunda baixa de estoque', async (t) => {
  const c = await criarCenario(t)
  await add(c, c.ids.produtoA)
  const key = randomUUID()
  const first = await c.como('cliente').post('/api/v1/pedidos').set('Idempotency-Key', key).send({}).expect(201)
  const repeat = await c.como('cliente').post('/api/v1/pedidos').set('Idempotency-Key', key).send({}).expect(200)
  assert.equal(first.body.data.id, repeat.body.data.id)
  await c.como('cliente').post('/api/v1/pedidos').set('Idempotency-Key', randomUUID()).send({}).expect(409)
  const product = await c.anonimo().get(`/api/v1/produtos/${c.ids.produtoA}`).expect(200)
  assert.equal(product.body.data.estoque, 1)
})

test('item sem estoque desfaz pedido inteiro e mantém carrinho', async (t) => {
  const c = await criarCenario(t)
  await add(c, c.ids.produtoA)
  await add(c, c.ids.produtoB)
  await c.consultar('update produtos set estoque = 0 where id = $1', [c.ids.produtoB])
  const fail = await c.como('cliente').post('/api/v1/pedidos')
    .set('Idempotency-Key', randomUUID()).send({}).expect(409)
  assert.equal(fail.body.error.code, 'ESTOQUE_INSUFICIENTE')
  const orders = await c.como('cliente').get('/api/v1/pedidos').expect(200)
  assert.deepEqual(orders.body.data, [])
  const cart = await c.como('cliente').get('/api/v1/carrinho').expect(200)
  assert.equal(cart.body.data.length, 2)
  const p = await c.anonimo().get(`/api/v1/produtos/${c.ids.produtoA}`).expect(200)
  assert.equal(p.body.data.estoque, 2)
})

test('checkout exige telefone mesmo quando chamado sem tela', async (t) => {
  const c = await criarCenario(t)
  await c.consultar('update perfis set telefone = null where id = $1', [c.ids.cliente])
  await add(c, c.ids.produtoA)
  await c.como('cliente').post('/api/v1/pedidos')
    .set('Idempotency-Key', randomUUID()).send({}).expect(400)
})

test('valores que excedem numeric(12,2) são recusados com erro de entrada', async (t) => {
  const c = await criarCenario(t)
  await c.consultar('update produtos set preco = 9999999999.99 where id = $1', [c.ids.produtoA])
  await add(c, c.ids.produtoA, 2)
  const result = await c.como('cliente').post('/api/v1/pedidos')
    .set('Idempotency-Key', randomUUID()).send({}).expect(400)
  assert.equal(result.body.error.code, 'ENTRADA_INVALIDA')
})
