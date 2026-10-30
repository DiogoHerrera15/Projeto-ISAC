import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { criarCenario } from '../helpers/cenario.js'

async function pedido(c, itens) {
  for (const [produto, quantidade] of itens) {
    await c.como('cliente').put(`/api/v1/carrinho/itens/${produto}`).send({ quantidade }).expect(200)
  }
  const { body } = await c.como('cliente').post('/api/v1/pedidos').set('Idempotency-Key', randomUUID()).send({}).expect(201)
  return body.data.id
}

// Confirma pelo fluxo normal e só então fixa a data, para o teste não depender do relógio.
async function confirmadoEm(c, id, quando) {
  await c.como('admin').post(`/api/v1/admin/pedidos/${id}/confirmacao`).send({}).expect(200)
  await c.consultar('update pedidos set confirmado_em = $2, criado_em = $2 where id = $1', [id, quando])
}

async function cenarioComVendas(t) {
  const c = await criarCenario(t)
  await c.consultar('update produtos set estoque = 50')
  const p1 = await pedido(c, [[c.ids.produtoA, 1]])
  await confirmadoEm(c, p1, '2026-03-10T12:00:00-03:00')
  const p2 = await pedido(c, [[c.ids.produtoA, 1], [c.ids.produtoB, 2]])
  await confirmadoEm(c, p2, '2026-03-20T23:30:00-03:00') // 02:30 UTC do dia 21: conta no dia 20 em Recife
  await pedido(c, [[c.ids.produtoB, 1]]) // pendente: fora do relatório
  const cancelado = await pedido(c, [[c.ids.produtoA, 1]])
  await c.como('cliente').post(`/api/v1/pedidos/${cancelado}/cancelamento`).send({}).expect(200)
  return c
}

test('relatório soma só vendas confirmadas, por período e por loja', async (t) => {
  const c = await cenarioComVendas(t)
  const { body } = await c.como('admin').get('/api/v1/admin/relatorios/vendas?de=2026-03-01&ate=2026-03-31&agrupar=dia').expect(200)
  const r = body.data
  assert.deepEqual(r.totais, { pedidos: 2, valor_total: '200.00', comissao_isac: '10.00', valor_vendedores: '190.00' })
  assert.equal(r.por_periodo.length, 31)
  assert.equal(r.por_periodo[0].inicio, '2026-03-01')
  const dia10 = r.por_periodo.find((p) => p.inicio === '2026-03-10')
  const dia20 = r.por_periodo.find((p) => p.inicio === '2026-03-20')
  assert.deepEqual([dia10.pedidos, dia10.valor_total, dia10.comissao_isac], [1, '50.00', '2.50'])
  assert.deepEqual([dia20.pedidos, dia20.valor_total], [1, '150.00'])
  assert.equal(r.por_periodo.find((p) => p.inicio === '2026-03-21').pedidos, 0)
  const lojaA = r.por_loja.find((l) => l.loja_id === c.ids.lojaA)
  const lojaB = r.por_loja.find((l) => l.loja_id === c.ids.lojaB)
  assert.deepEqual([lojaA.pedidos, lojaA.valor_total, lojaA.comissao_isac, lojaA.valor_vendedores], [2, '100.00', '5.00', '95.00'])
  assert.deepEqual([lojaB.pedidos, lojaB.valor_total], [1, '100.00'])
})

test('relatório filtra pelo período e agrupa por semana e mês', async (t) => {
  const c = await cenarioComVendas(t)
  const segunda = await c.como('admin').get('/api/v1/admin/relatorios/vendas?de=2026-03-15&ate=2026-03-31').expect(200)
  assert.equal(segunda.body.data.totais.pedidos, 1)
  assert.equal(segunda.body.data.totais.valor_total, '150.00')
  const mes = await c.como('admin').get('/api/v1/admin/relatorios/vendas?de=2026-01-01&ate=2026-04-30&agrupar=mes').expect(200)
  assert.deepEqual(mes.body.data.por_periodo.map((p) => [p.inicio, p.pedidos]),
    [['2026-01-01', 0], ['2026-02-01', 0], ['2026-03-01', 2], ['2026-04-01', 0]])
  const semana = await c.como('admin').get('/api/v1/admin/relatorios/vendas?de=2026-03-09&ate=2026-03-22&agrupar=semana').expect(200)
  assert.deepEqual(semana.body.data.por_periodo.map((p) => [p.inicio, p.pedidos]), [['2026-03-09', 1], ['2026-03-16', 1]])
  const tudo = await c.como('admin').get('/api/v1/admin/relatorios/vendas').expect(200)
  assert.equal(tudo.body.data.totais.pedidos, 2)
  assert.equal(tudo.body.data.por_periodo[0].inicio, '2026-03-10')
  assert.equal(tudo.body.data.por_periodo.at(-1).inicio, '2026-03-20')
})

test('relatório sem vendas devolve zeros', async (t) => {
  const c = await criarCenario(t)
  const { body } = await c.como('admin').get('/api/v1/admin/relatorios/vendas').expect(200)
  assert.deepEqual(body.data.totais, { pedidos: 0, valor_total: '0.00', comissao_isac: '0.00', valor_vendedores: '0.00' })
  assert.deepEqual(body.data.por_periodo, [])
  assert.deepEqual(body.data.por_loja, [])
})

test('relatório é restrito à administração e valida os filtros', async (t) => {
  const c = await criarCenario(t)
  await c.como('vendedorA').get('/api/v1/admin/relatorios/vendas').expect(403)
  await c.anonimo().get('/api/v1/admin/relatorios/vendas').expect(401)
  const admin = c.como('admin')
  await admin.get('/api/v1/admin/relatorios/vendas?de=2026-02-30').expect(400)
  await admin.get('/api/v1/admin/relatorios/vendas?de=2026-03-10&ate=2026-03-01').expect(400)
  await admin.get('/api/v1/admin/relatorios/vendas?agrupar=ano').expect(400)
  await c.como('admin').get('/api/v1/admin/relatorios/vendas?extra=1').expect(400)
  await c.como('admin').get('/api/v1/admin/relatorios/vendas?de=2020-01-01&ate=2026-01-01&agrupar=dia').expect(400)
  await c.como('admin').get('/api/v1/admin/relatorios/vendas?de=2020-01-01&ate=2026-01-01&agrupar=mes').expect(200)
})
