import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import { criarCenario } from '../helpers/cenario.js'
import { createApp } from '../../src/app.js'
import { cleanOrphanImages } from '../../src/modules/imagens/cleanup.js'

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=',
  'base64',
)

test('imagem válida pertence à loja e persiste após recriar app', async (t) => {
  const c = await criarCenario(t)
  const uploaded = await c.como('vendedorA').post('/api/v1/minha-loja/imagens')
    .attach('arquivo', png, { filename: 'foto.png', contentType: 'image/png' }).expect(201)
  const imageId = uploaded.body.data.id
  assert.equal(uploaded.body.data.foto_url, `/api/v1/imagens/${imageId}`)
  const result = await c.como('vendedorA').post('/api/v1/minha-loja/produtos')
    .send({ nome: 'Com foto', preco: '12.00', estoque: 1, ativo: true, imagem_id: imageId }).expect(201)
  assert.equal(result.body.data.foto_url, uploaded.body.data.foto_url)
  await c.como('vendedorB').post('/api/v1/minha-loja/produtos')
    .send({ nome: 'Foto alheia', preco: '12.00', estoque: 1, ativo: true, imagem_id: imageId }).expect(404)
  const file = await c.consultar('select chave_arquivo from imagens where id = $1', [imageId])
  assert.deepEqual(await readFile(`${c.config.uploadDir}/${file.rows[0].chave_arquivo}`), png)
  const restarted = createApp({ pool: c.pool, config: c.config })
  const get = await (await import('supertest')).default(restarted).get(`/api/v1/imagens/${imageId}`).expect(200)
  assert.equal(get.headers['content-type'], 'image/png')
  assert.equal(get.headers['x-content-type-options'], 'nosniff')
})

test('MIME falso, SVG, tamanho grande e usuário sem loja são recusados', async (t) => {
  const c = await criarCenario(t)
  await c.como('vendedorA').post('/api/v1/minha-loja/imagens')
    .attach('arquivo', Buffer.from('<html>inválido</html>'), { filename: 'foto.png', contentType: 'image/png' }).expect(415)
  await c.como('vendedorA').post('/api/v1/minha-loja/imagens')
    .attach('arquivo', Buffer.from('<svg/>'), { filename: 'foto.svg', contentType: 'image/svg+xml' }).expect(415)
  await c.como('vendedorA').post('/api/v1/minha-loja/imagens')
    .attach('arquivo', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'foto.png', contentType: 'image/png' }).expect(413)
  await c.como('cliente').post('/api/v1/minha-loja/imagens')
    .attach('arquivo', png, { filename: 'foto.png', contentType: 'image/png' }).expect(404)
  await c.anonimo().post('/api/v1/minha-loja/imagens')
    .attach('arquivo', png, { filename: 'foto.png', contentType: 'image/png' }).expect(401)
  const images = await c.consultar('select count(*)::int as count from imagens')
  assert.equal(images.rows[0].count, 0)
})

test('limpeza remove apenas imagens antigas sem produto', async (t) => {
  const c = await criarCenario(t)
  const upload = async () => (await c.como('vendedorA').post('/api/v1/minha-loja/imagens')
    .attach('arquivo', png, { filename: 'foto.png', contentType: 'image/png' }).expect(201)).body.data.id
  const attached = await upload()
  const orphan = await upload()
  await c.como('vendedorA').post('/api/v1/minha-loja/produtos')
    .send({ nome: 'Ligado', preco: '1.00', estoque: 1, ativo: true, imagem_id: attached }).expect(201)
  const records = await c.consultar('select id, chave_arquivo from imagens')
  await c.consultar("update imagens set criado_em = now() - interval '25 hours'")
  assert.equal(await cleanOrphanImages(c.pool, c.config.uploadDir), 1)
  const files = Object.fromEntries(records.rows.map((row) => [row.id, row.chave_arquivo]))
  await access(`${c.config.uploadDir}/${files[attached]}`)
  await assert.rejects(access(`${c.config.uploadDir}/${files[orphan]}`), { code: 'ENOENT' })
})
