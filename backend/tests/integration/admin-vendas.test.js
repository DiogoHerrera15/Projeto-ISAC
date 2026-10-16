import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { criarCenario } from '../helpers/cenario.js'

test('vendedor vê somente itens da sua loja e contato da compra', async (t) => {
  const c = await criarCenario(t)
  for (const id of [c.ids.produtoA, c.ids.produtoB]) {
    await c.como('cliente').put(`/api/v1/carrinho/itens/${id}`).send({ quantidade: 1 }).expect(200)
  }
  await c.como('cliente').post('/api/v1/pedidos').set('Idempotency-Key', randomUUID()).send({}).expect(201)
  const a = await c.como('vendedorA').get('/api/v1/minha-loja/vendas').expect(200)
  const b = await c.como('vendedorB').get('/api/v1/minha-loja/vendas').expect(200)
  assert.equal(a.body.data.length, 1)
  assert.equal(a.body.data[0].produto_nome, 'Produto A')
  assert.equal(a.body.data[0].cliente_telefone, '81999999999')
  assert.equal(b.body.data[0].produto_nome, 'Produto B')
  const admin = await c.como('admin').get('/api/v1/admin/pedidos').expect(200)
  assert.equal(admin.body.data[0].itens.length, 2)
  assert.equal(admin.body.data[0].cliente.nome, 'cliente')
  await c.como('cliente').get('/api/v1/admin/pedidos').expect(403)
})

test('admin pode pausar lojas e produtos, mas não editar seu preço', async (t) => {
  const c = await criarCenario(t)
  const stores = await c.como('admin').get('/api/v1/admin/lojas').expect(200)
  assert.equal(stores.body.data.length, 2)
  await c.como('admin').patch(`/api/v1/admin/lojas/${c.ids.lojaA}`)
    .send({ ativa: false }).expect(200)
  await c.anonimo().get(`/api/v1/produtos/${c.ids.produtoA}`).expect(404)
  await c.como('admin').patch(`/api/v1/admin/produtos/${c.ids.produtoA}`)
    .send({ ativo: false, versao: 1 }).expect(200)
  await c.como('admin').patch(`/api/v1/admin/produtos/${c.ids.produtoA}`)
    .send({ preco: '1.00', versao: 2 }).expect(400)
})
