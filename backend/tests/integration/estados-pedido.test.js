import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { criarCenario } from '../helpers/cenario.js'

async function comprar(c, role = 'cliente') {
  await c.como(role).put(`/api/v1/carrinho/itens/${c.ids.produtoA}`).send({ quantidade: 1 }).expect(200)
  return c.como(role).post('/api/v1/pedidos').set('Idempotency-Key', randomUUID()).send({}).expect(201)
}

test('cancelamento por comprador repõe estoque apenas uma vez', async (t) => {
  const c = await criarCenario(t)
  const bought = await comprar(c)
  const route = `/api/v1/pedidos/${bought.body.data.id}/cancelamento`
  await c.como('outroCliente').post(route).send({}).expect(404)
  const canceled = await c.como('cliente').post(route).send({}).expect(200)
  assert.equal(canceled.body.data.status, 'cancelado')
  await c.como('cliente').post(route).send({}).expect(409)
  const p = await c.anonimo().get(`/api/v1/produtos/${c.ids.produtoA}`).expect(200)
  assert.equal(p.body.data.estoque, 2)
})

test('admin confirma apenas pendente, sem nova baixa e sem alterar histórico', async (t) => {
  const c = await criarCenario(t)
  const bought = await comprar(c)
  const orderId = bought.body.data.id
  const route = `/api/v1/admin/pedidos/${orderId}/confirmacao`
  await c.como('vendedorA').post(route).send({}).expect(403)
  const confirmed = await c.como('admin').post(route).send({}).expect(200)
  assert.equal(confirmed.body.data.status, 'confirmado')
  assert.ok(confirmed.body.data.confirmado_em)
  await c.como('admin').post(route).send({}).expect(409)
  await c.como('cliente').post(`/api/v1/pedidos/${orderId}/cancelamento`).send({}).expect(409)
  const p = await c.anonimo().get(`/api/v1/produtos/${c.ids.produtoA}`).expect(200)
  assert.equal(p.body.data.estoque, 1)
  await c.como('admin').patch('/api/v1/admin/configuracoes/comissao')
    .send({ percentual_comissao: '10.00' }).expect(200)
  const old = await c.como('cliente').get('/api/v1/pedidos').expect(200)
  assert.equal(old.body.data[0].comissao_isac, '2.50')
  assert.equal(old.body.data[0].itens[0].percentual_comissao, '5.00')
})

test('corrida entre confirmar e cancelar tem um vencedor', async (t) => {
  const c = await criarCenario(t)
  const bought = await comprar(c)
  const id = bought.body.data.id
  const responses = await Promise.all([
    Promise.resolve(c.como('admin').post(`/api/v1/admin/pedidos/${id}/confirmacao`).send({})),
    Promise.resolve(c.como('cliente').post(`/api/v1/pedidos/${id}/cancelamento`).send({})),
  ])
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409])
  const order = await c.consultar('select status from pedidos where id = $1', [id])
  const product = await c.consultar('select estoque from produtos where id = $1', [c.ids.produtoA])
  assert.equal(product.rows[0].estoque, order.rows[0].status === 'cancelado' ? 2 : 1)
})

test('admin pode cancelar e chave antiga retorna o pedido cancelado', async (t) => {
  const c = await criarCenario(t)
  await c.como('cliente').put(`/api/v1/carrinho/itens/${c.ids.produtoA}`).send({ quantidade: 1 }).expect(200)
  const key = randomUUID()
  const first = await c.como('cliente').post('/api/v1/pedidos').set('Idempotency-Key', key).send({}).expect(201)
  await c.como('admin').post(`/api/v1/pedidos/${first.body.data.id}/cancelamento`).send({}).expect(200)
  const repeat = await c.como('cliente').post('/api/v1/pedidos').set('Idempotency-Key', key).send({}).expect(200)
  assert.equal(repeat.body.data.id, first.body.data.id)
  assert.equal(repeat.body.data.status, 'cancelado')
})
