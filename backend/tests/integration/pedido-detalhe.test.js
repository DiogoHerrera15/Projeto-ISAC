import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { criarCenario } from '../helpers/cenario.js'

async function pedidoComDuasLojas(c) {
  await c.como('cliente').put(`/api/v1/carrinho/itens/${c.ids.produtoA}`).send({ quantidade: 2 }).expect(200)
  await c.como('cliente').put(`/api/v1/carrinho/itens/${c.ids.produtoB}`).send({ quantidade: 1 }).expect(200)
  const { body } = await c.como('cliente').post('/api/v1/pedidos').set('Idempotency-Key', randomUUID()).send({}).expect(201)
  return body.data.id
}

test('cliente vê o próprio pedido completo com a divisão entre lojas e ISAC', async (t) => {
  const c = await criarCenario(t)
  const id = await pedidoComDuasLojas(c)
  const { body } = await c.como('cliente').get(`/api/v1/pedidos/${id}`).expect(200)
  assert.equal(body.data.visao, 'cliente')
  assert.equal(body.data.status, 'pendente')
  assert.equal(body.data.itens.length, 2)
  assert.equal(body.data.valor_total, '150.00')
  assert.equal(body.data.comissao_isac, '7.50')
  assert.equal(body.data.valor_vendedores, '142.50')
  const itemA = body.data.itens.find((i) => i.loja.id === c.ids.lojaA)
  assert.equal(itemA.subtotal, '100.00')
  assert.equal(itemA.valor_comissao, '5.00')
  assert.equal(itemA.valor_vendedor, '95.00')
})

test('vendedora vê só os itens da sua loja, com totais e contato do cliente', async (t) => {
  const c = await criarCenario(t)
  const id = await pedidoComDuasLojas(c)
  const a = await c.como('vendedorA').get(`/api/v1/pedidos/${id}`).expect(200)
  assert.equal(a.body.data.visao, 'vendedor')
  assert.deepEqual(a.body.data.itens.map((i) => i.nome_produto), ['Produto A'])
  assert.equal(a.body.data.valor_total, '100.00')
  assert.equal(a.body.data.comissao_isac, '5.00')
  assert.equal(a.body.data.valor_vendedores, '95.00')
  assert.equal(a.body.data.cliente.telefone, '81999999999')
  const b = await c.como('vendedorB').get(`/api/v1/pedidos/${id}`).expect(200)
  assert.deepEqual(b.body.data.itens.map((i) => i.nome_produto), ['Produto B'])
  assert.equal(b.body.data.valor_total, '50.00')
})

test('administração vê tudo e o status acompanha a confirmação', async (t) => {
  const c = await criarCenario(t)
  const id = await pedidoComDuasLojas(c)
  await c.como('admin').post(`/api/v1/admin/pedidos/${id}/confirmacao`).send({}).expect(200)
  const { body } = await c.como('admin').get(`/api/v1/pedidos/${id}`).expect(200)
  assert.equal(body.data.visao, 'admin')
  assert.equal(body.data.status, 'confirmado')
  assert.ok(body.data.confirmado_em)
  assert.equal(body.data.itens.length, 2)
  assert.equal(body.data.cliente.nome, 'cliente')
})

test('pedido de outra pessoa, sem itens da loja ou inexistente responde 404', async (t) => {
  const c = await criarCenario(t)
  await c.como('cliente').put(`/api/v1/carrinho/itens/${c.ids.produtoA}`).send({ quantidade: 1 }).expect(200)
  const { body } = await c.como('cliente').post('/api/v1/pedidos').set('Idempotency-Key', randomUUID()).send({}).expect(201)
  const id = body.data.id
  await c.como('outroCliente').get(`/api/v1/pedidos/${id}`).expect(404)
  await c.como('vendedorB').get(`/api/v1/pedidos/${id}`).expect(404)
  await c.anonimo().get(`/api/v1/pedidos/${id}`).expect(401)
  await c.como('cliente').get(`/api/v1/pedidos/${randomUUID()}`).expect(404)
  await c.como('cliente').get('/api/v1/pedidos/abc').expect(404)
})
