import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { criarCenario } from '../helpers/cenario.js'

test('dois clientes disputando a última unidade geram só um pedido', async (t) => {
  const c = await criarCenario(t)
  await c.consultar('update produtos set estoque = 1 where id = $1', [c.ids.produtoA])
  for (const role of ['cliente', 'outroCliente']) {
    await c.como(role).put(`/api/v1/carrinho/itens/${c.ids.produtoA}`).send({ quantidade: 1 }).expect(200)
  }
  const blocker = await c.pool.connect()
  await blocker.query('begin')
  await blocker.query('select id from produtos where id = $1 for update', [c.ids.produtoA])
  let pending
  try {
    pending = [
      Promise.resolve(c.como('cliente').post('/api/v1/pedidos').set('Idempotency-Key', randomUUID()).send({})),
      Promise.resolve(c.como('outroCliente').post('/api/v1/pedidos').set('Idempotency-Key', randomUUID()).send({})),
    ]
    let lockObserved = false
    for (let attempt = 0; attempt < 50; attempt++) {
      const state = await c.consultar(
        "select count(*)::int as count from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock'",
      )
      if (state.rows[0].count > 0) { lockObserved = true; break }
      await delay(20)
    }
    assert.equal(lockObserved, true, 'requisições devem disputar o bloqueio real do PostgreSQL')
  } finally {
    await blocker.query('commit')
    blocker.release()
  }
  const results = await Promise.all(pending)
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409])
  const stock = await c.consultar('select estoque from produtos where id = $1', [c.ids.produtoA])
  assert.equal(stock.rows[0].estoque, 0)
  const orders = await c.consultar('select count(*)::int as count from pedidos')
  assert.equal(orders.rows[0].count, 1)
})

test('duas finalizações simultâneas com a mesma chave reutilizam o pedido', async (t) => {
  const c = await criarCenario(t)
  await c.como('cliente').put(`/api/v1/carrinho/itens/${c.ids.produtoA}`).send({ quantidade: 1 }).expect(200)
  const key = randomUUID()
  const results = await Promise.all([
    Promise.resolve(c.como('cliente').post('/api/v1/pedidos').set('Idempotency-Key', key).send({})),
    Promise.resolve(c.como('cliente').post('/api/v1/pedidos').set('Idempotency-Key', key).send({})),
  ])
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 201])
  assert.equal(results[0].body.data.id, results[1].body.data.id)
  const product = await c.consultar('select estoque from produtos where id = $1', [c.ids.produtoA])
  assert.equal(product.rows[0].estoque, 1)
})
