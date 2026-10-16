import test from 'node:test'
import assert from 'node:assert/strict'
import { criarCenario } from '../helpers/cenario.js'

test('PUT repetido define quantidade absoluta sem vazar carrinho', async (t) => {
  const c = await criarCenario(t)
  const route = `/api/v1/carrinho/itens/${c.ids.produtoA}`
  await c.como('cliente').put(route).send({ quantidade: 2 }).expect(200)
  await c.como('cliente').put(route).send({ quantidade: 2 }).expect(200)
  const mine = await c.como('cliente').get('/api/v1/carrinho').expect(200)
  const other = await c.como('outroCliente').get('/api/v1/carrinho').expect(200)
  assert.equal(mine.body.data[0].quantidade, 2)
  assert.deepEqual(other.body.data, [])
  await c.anonimo().get('/api/v1/carrinho').expect(401)
})

test('quantidade inválida é recusada e exclusão repetida é segura', async (t) => {
  const c = await criarCenario(t)
  const route = `/api/v1/carrinho/itens/${c.ids.produtoA}`
  for (const quantity of [0, 1000, 1.5, '2']) {
    await c.como('cliente').put(route).send({ quantidade: quantity }).expect(400)
  }
  await c.como('cliente').put(route).send({ quantidade: 1 }).expect(200)
  await c.como('cliente').delete(route).expect(204)
  await c.como('cliente').delete(route).expect(204)
  const rows = await c.como('cliente').get('/api/v1/carrinho').expect(200)
  assert.deepEqual(rows.body.data, [])
})

test('item tornado inativo continua removível e não pode ser incluído novamente', async (t) => {
  const c = await criarCenario(t)
  const route = `/api/v1/carrinho/itens/${c.ids.produtoA}`
  await c.como('cliente').put(route).send({ quantidade: 1 }).expect(200)
  await c.consultar('update produtos set ativo = false where id = $1', [c.ids.produtoA])
  const cart = await c.como('cliente').get('/api/v1/carrinho').expect(200)
  assert.equal(cart.body.data[0].produto_id, c.ids.produtoA)
  assert.equal(cart.body.data[0].produto.ativo, false)
  await c.como('cliente').put(route).send({ quantidade: 2 }).expect(409)
  await c.como('cliente').delete(route).expect(204)
})
