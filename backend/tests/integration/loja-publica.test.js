import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { criarCenario } from '../helpers/cenario.js'

test('página pública da loja mostra descrição e total de produtos, sem dados da vendedora', async (t) => {
  const c = await criarCenario(t)
  await c.consultar("update lojas set descricao = 'Doces caseiros' where id = $1", [c.ids.lojaA])
  await c.consultar("insert into produtos(loja_id, nome, preco, estoque, ativo) values ($1, 'Pausado', '5.00', 1, false)", [c.ids.lojaA])
  const { body } = await c.anonimo().get(`/api/v1/lojas/${c.ids.lojaA}`).expect(200)
  assert.equal(body.data.nome, 'Doces de A')
  assert.equal(body.data.descricao, 'Doces caseiros')
  assert.equal(body.data.total_produtos, 1)
  assert.equal('vendedor_id' in body.data, false)
  assert.equal(JSON.stringify(body).includes('telefone'), false)
  const produtos = await c.anonimo().get(`/api/v1/produtos?lojaId=${c.ids.lojaA}`).expect(200)
  assert.deepEqual(produtos.body.data.map((p) => p.id), [c.ids.produtoA])
})

test('loja fechada só aparece para a própria vendedora e para a administração', async (t) => {
  const c = await criarCenario(t)
  await c.consultar('update lojas set ativa = false where id = $1', [c.ids.lojaA])
  await c.anonimo().get(`/api/v1/lojas/${c.ids.lojaA}`).expect(404)
  await c.como('cliente').get(`/api/v1/lojas/${c.ids.lojaA}`).expect(404)
  await c.como('vendedorB').get(`/api/v1/lojas/${c.ids.lojaA}`).expect(404)
  const own = await c.como('vendedorA').get(`/api/v1/lojas/${c.ids.lojaA}`).expect(200)
  assert.equal(own.body.data.ativa, false)
  await c.como('admin').get(`/api/v1/lojas/${c.ids.lojaA}`).expect(200)
})

test('id de loja inválido ou inexistente responde 404', async (t) => {
  const c = await criarCenario(t)
  await c.anonimo().get('/api/v1/lojas/nao-e-uuid').expect(404)
  await c.anonimo().get(`/api/v1/lojas/${randomUUID()}`).expect(404)
})
