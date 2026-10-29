import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import { requireSameOrigin } from '../../src/http/origin.js'

function chamar(middleware, method, headers) {
  const req = { method, get: (nome) => headers[nome] }
  let erro
  middleware(req, {}, (e) => { erro = e })
  return erro
}
const web = { 'X-ISAC-Client': 'web' }
const semLog = { log: () => {} }

test('escritas só passam com origem permitida e cabeçalho do cliente', () => {
  const um = requireSameOrigin('http://localhost:5173', semLog)
  assert.equal(chamar(um, 'POST', { Origin: 'http://localhost:5173', ...web }), undefined)
  assert.equal(chamar(um, 'POST', { Origin: 'https://outro.dev', ...web })?.code, 'ORIGEM_INVALIDA')
  assert.equal(chamar(um, 'POST', { Origin: 'http://localhost:5173' })?.code, 'ORIGEM_INVALIDA')
  assert.equal(chamar(um, 'POST', web)?.code, 'ORIGEM_INVALIDA')
  assert.equal(chamar(um, 'GET', {}), undefined)
})

test('várias origens permitidas são aceitas e as demais recusadas', () => {
  const varias = requireSameOrigin(['http://localhost:5173', 'https://app.exemplo.dev'], semLog)
  assert.equal(chamar(varias, 'PATCH', { Origin: 'https://app.exemplo.dev', ...web }), undefined)
  assert.equal(chamar(varias, 'PATCH', { Origin: 'http://localhost:5173', ...web }), undefined)
  assert.equal(chamar(varias, 'PATCH', { Origin: 'https://app.exemplo.dev/', ...web })?.code, 'ORIGEM_INVALIDA')
})

test('recusa registra o que chegou e o que era esperado', () => {
  const linhas = []
  const middleware = requireSameOrigin('http://localhost:5173', { log: (linha) => linhas.push(linha) })
  chamar(middleware, 'POST', { Origin: 'https://outro.dev', ...web })
  assert.equal(linhas.length, 1)
  assert.match(linhas[0], /Origin=https:\/\/outro\.dev/)
  assert.match(linhas[0], /permitidas=http:\/\/localhost:5173/)
})

test('respostas levam cabeçalhos de segurança', async (t) => {
  const uploadDir = await mkdtemp(join(tmpdir(), 'isac-http-'))
  t.after(() => rm(uploadDir, { recursive: true, force: true }))
  const app = createApp({ pool: {}, config: { appOrigin: 'http://localhost:5173', uploadDir } })
  const res = await request(app).get('/api/v1/health').expect(200)
  assert.equal(res.headers['x-content-type-options'], 'nosniff')
  assert.equal(res.headers['x-frame-options'], 'DENY')
  assert.equal(res.headers['referrer-policy'], 'same-origin')
  assert.equal(res.headers['x-powered-by'], undefined)
})
