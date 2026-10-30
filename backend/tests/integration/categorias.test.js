import test from 'node:test'
import assert from 'node:assert/strict'
import { criarCenario } from '../helpers/cenario.js'

test('categorias são públicas e vêm na ordem definida pela migration', async (t) => {
  const c = await criarCenario(t)
  const { body } = await c.anonimo().get('/api/v1/categorias').expect(200)
  assert.equal(body.data[0].id, 'doces')
  assert.ok(body.data.some((cat) => cat.id === 'artesanato' && cat.nome === 'Artesanato'))
})

test('vendedor escolhe a categoria ao cadastrar e ao editar o produto', async (t) => {
  const c = await criarCenario(t)
  const created = await c.como('vendedorA').post('/api/v1/minha-loja/produtos')
    .send({ nome: 'Pano bordado', preco: '25.00', estoque: 3, ativo: true, categoria_id: 'artesanato' }).expect(201)
  assert.deepEqual(created.body.data.categoria, { id: 'artesanato', nome: 'Artesanato' })
  const edited = await c.como('vendedorA').patch(`/api/v1/minha-loja/produtos/${created.body.data.id}`)
    .send({ categoria_id: 'casa', versao: 1 }).expect(200)
  assert.equal(edited.body.data.categoria_id, 'casa')
  const kept = await c.como('vendedorA').patch(`/api/v1/minha-loja/produtos/${created.body.data.id}`)
    .send({ estoque: 4, versao: 2 }).expect(200)
  assert.equal(kept.body.data.categoria_id, 'casa')
  const cleared = await c.como('vendedorA').patch(`/api/v1/minha-loja/produtos/${created.body.data.id}`)
    .send({ categoria_id: null, versao: 3 }).expect(200)
  assert.equal(cleared.body.data.categoria, null)
})

test('categoria inexistente é recusada sem criar produto', async (t) => {
  const c = await criarCenario(t)
  const res = await c.como('vendedorA').post('/api/v1/minha-loja/produtos')
    .send({ nome: 'X', preco: '1.00', estoque: 1, ativo: true, categoria_id: 'nao-existe' }).expect(400)
  assert.equal(res.body.error.code, 'ENTRADA_INVALIDA')
  const { rows } = await c.consultar("select count(*)::int as total from produtos where nome = 'X'")
  assert.equal(rows[0].total, 0)
  await c.como('vendedorA').patch(`/api/v1/minha-loja/produtos/${c.ids.produtoA}`)
    .send({ categoria_id: 'nao-existe', versao: 1 }).expect(400)
})

test('catálogo filtra por categoria e ordena por preço com paginação estável', async (t) => {
  const c = await criarCenario(t)
  await c.consultar("update produtos set categoria_id = 'doces', preco = '10.00' where id = $1", [c.ids.produtoA])
  await c.consultar("update produtos set categoria_id = 'artesanato', preco = '90.00' where id = $1", [c.ids.produtoB])
  await c.consultar(
    "insert into produtos(loja_id, nome, preco, estoque, categoria_id) values ($1, 'Doce caro', '40.00', 1, 'doces')",
    [c.ids.lojaB],
  )
  const doces = await c.anonimo().get('/api/v1/produtos?categoria=doces').expect(200)
  assert.equal(doces.body.meta.total, 2)
  assert.ok(doces.body.data.every((p) => p.categoria.id === 'doces'))

  const menor = await c.anonimo().get('/api/v1/produtos?ordem=menor').expect(200)
  assert.deepEqual(menor.body.data.map((p) => p.preco), ['10.00', '40.00', '90.00'])
  const maior = await c.anonimo().get('/api/v1/produtos?ordem=maior&categoria=doces').expect(200)
  assert.deepEqual(maior.body.data.map((p) => p.preco), ['40.00', '10.00'])

  const page1 = await c.anonimo().get('/api/v1/produtos?ordem=menor&limite=2&pagina=1').expect(200)
  const page2 = await c.anonimo().get('/api/v1/produtos?ordem=menor&limite=2&pagina=2').expect(200)
  assert.deepEqual([...page1.body.data, ...page2.body.data].map((p) => p.preco), ['10.00', '40.00', '90.00'])

  const vazio = await c.anonimo().get('/api/v1/produtos?categoria=moda').expect(200)
  assert.equal(vazio.body.meta.total, 0)
})

test('filtros de categoria e ordem inválidos são recusados', async (t) => {
  const c = await criarCenario(t)
  await c.anonimo().get('/api/v1/produtos?ordem=preco;drop').expect(400)
  await c.anonimo().get('/api/v1/produtos?categoria=Doces%20e').expect(400)
  await c.anonimo().get('/api/v1/produtos?categoria=a&categoria=b').expect(400)
})
