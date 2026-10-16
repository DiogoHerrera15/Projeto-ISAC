import test from 'node:test'
import assert from 'node:assert/strict'
import { criarCenario } from '../helpers/cenario.js'
import { seedDemo } from '../../src/db/seedDemo.js'

test('seed fictício pode ser executado duas vezes sem duplicar contas ou produtos', async (t) => {
  const c = await criarCenario(t)
  await seedDemo(c.pool)
  await seedDemo(c.pool)
  const users = await c.consultar("select count(*)::int as total from usuarios where email in ('cliente@exemplo.com', 'admin@isac.org')")
  const products = await c.consultar("select count(*)::int as total from produtos where id::text like '30000000-%'")
  assert.equal(users.rows[0].total, 2)
  assert.equal(products.rows[0].total, 4)
  const visible = await c.anonimo().get('/api/v1/produtos').expect(200)
  assert.equal(visible.body.data.length, 6)
})
