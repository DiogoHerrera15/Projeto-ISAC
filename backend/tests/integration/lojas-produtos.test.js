import test from 'node:test'
import assert from 'node:assert/strict'
import { criarCenario } from '../helpers/cenario.js'

test('cliente abre uma loja, mas não consegue abrir outra', async (t) => {
  const c = await criarCenario(t)
  const created = await c.como('cliente').post('/api/v1/minha-loja')
    .send({ nome: 'Minha loja', descricao: 'Produtos locais' }).expect(201)
  assert.equal(created.body.data.vendedor_id, c.ids.cliente)
  await c.como('cliente').post('/api/v1/minha-loja').send({ nome: 'Outra' }).expect(409)
  await c.anonimo().post('/api/v1/minha-loja').send({ nome: 'Inválida' }).expect(401)
})

test('vendedor não edita produto de outro e versão antiga é recusada', async (t) => {
  const c = await criarCenario(t)
  await c.como('vendedorB').patch(`/api/v1/minha-loja/produtos/${c.ids.produtoA}`)
    .send({ preco: '1.00', versao: 1 }).expect(404)
  const own = await c.como('vendedorA').patch(`/api/v1/minha-loja/produtos/${c.ids.produtoA}`)
    .send({ preco: '60.00', versao: 1 }).expect(200)
  assert.equal(own.body.data.versao, 2)
  await c.como('vendedorA').patch(`/api/v1/minha-loja/produtos/${c.ids.produtoA}`)
    .send({ estoque: 99, versao: 1 }).expect(409)
  const current = await c.anonimo().get(`/api/v1/produtos/${c.ids.produtoA}`).expect(200)
  assert.equal(current.body.data.estoque, 2)
})

test('produto rejeita preço inválido e vínculo de loja imposto pelo cliente', async (t) => {
  const c = await criarCenario(t)
  await c.como('vendedorA').post('/api/v1/minha-loja/produtos')
    .send({ nome: 'Teste', preco: 'NaN', estoque: 1, ativo: true }).expect(400)
  await c.como('vendedorA').post('/api/v1/minha-loja/produtos')
    .send({ nome: 'Teste', preco: '12.00', estoque: 1, ativo: true, loja_id: c.ids.lojaB }).expect(400)
  const created = await c.como('vendedorA').post('/api/v1/minha-loja/produtos')
    .send({ nome: 'Teste', preco: '12.00', estoque: 1, ativo: true }).expect(201)
  assert.equal(created.body.data.loja_id, c.ids.lojaA)
})
