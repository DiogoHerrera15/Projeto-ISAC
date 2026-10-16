import test from 'node:test'
import assert from 'node:assert/strict'
import { criarCenario } from '../helpers/cenario.js'

test('catálogo expõe só produtos e lojas ativos', async (t) => {
  const c = await criarCenario(t)
  const first = await c.anonimo().get('/api/v1/produtos').expect(200)
  assert.equal(first.body.data.length, 2)
  assert.equal(first.body.data[0].preco, '50.00')
  await c.consultar('update lojas set ativa = false where id = $1', [c.ids.lojaB])
  const listed = await c.anonimo().get('/api/v1/produtos').expect(200)
  assert.deepEqual(listed.body.data.map((p) => p.id), [c.ids.produtoA])
  await c.anonimo().get(`/api/v1/produtos/${c.ids.produtoB}`).expect(404)
  const owned = await c.como('vendedorB').get(`/api/v1/produtos/${c.ids.produtoB}`).expect(200)
  assert.equal(owned.body.data.id, c.ids.produtoB)
})

test('busca trata porcentagem como texto e paginação é estável', async (t) => {
  const c = await criarCenario(t)
  await c.consultar("update produtos set nome = '50% artesanal' where id = $1", [c.ids.produtoA])
  const search = await c.anonimo().get('/api/v1/produtos?busca=%25').expect(200)
  assert.deepEqual(search.body.data.map((p) => p.id), [c.ids.produtoA])
  const page1 = await c.anonimo().get('/api/v1/produtos?pagina=1&limite=1').expect(200)
  const page2 = await c.anonimo().get('/api/v1/produtos?pagina=2&limite=1').expect(200)
  assert.equal(page1.body.meta.total, 2)
  assert.notEqual(page1.body.data[0].id, page2.body.data[0].id)
  await c.anonimo().get('/api/v1/produtos?limite=101').expect(400)
})

test('taxa inicial e lojas ativas são públicas', async (t) => {
  const c = await criarCenario(t)
  const tax = await c.anonimo().get('/api/v1/configuracoes/comissao').expect(200)
  assert.equal(tax.body.data.percentual_comissao, '5.00')
  const shops = await c.anonimo().get('/api/v1/lojas').expect(200)
  assert.equal(shops.body.data.length, 2)
  assert.equal(JSON.stringify(shops.body).includes('telefone'), false)
})

test('paginação percorre mais de cem produtos sem repetir IDs', async (t) => {
  const c = await criarCenario(t)
  await c.consultar(
    "insert into produtos(loja_id, nome, preco, estoque) select $1, 'Novo ' || n, 1.00, 1 from generate_series(1, 105) n",
    [c.ids.lojaA],
  )
  const first = await c.anonimo().get('/api/v1/produtos?pagina=1&limite=100').expect(200)
  const second = await c.anonimo().get('/api/v1/produtos?pagina=2&limite=100').expect(200)
  const ids = [...first.body.data, ...second.body.data].map((p) => p.id)
  assert.equal(first.body.meta.total, 107)
  assert.equal(ids.length, 107)
  assert.equal(new Set(ids).size, 107)
})
