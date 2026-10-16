import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { criarCenario } from '../helpers/cenario.js'
import { createApp } from '../../src/app.js'

test('cadastro, sessão, perfil e logout', async (t) => {
  const c = await criarCenario(t)
  const browser = request.agent(c.app)
  const headers = { Origin: c.config.appOrigin, 'X-ISAC-Client': 'web' }
  const signup = await browser.post('/api/v1/auth/cadastro').set(headers)
    .send({ nome: ' Ana ', email: ' ANA@EXEMPLO.COM ', senha: 'senha-forte-123', telefone: '(81) 99999-9999' }).expect(201)
  assert.equal(signup.body.data.usuario.email, 'ana@exemplo.com')
  assert.equal(signup.body.data.perfil.telefone, '81999999999')
  assert.equal(signup.body.data.precisaConfirmarEmail, false)
  assert.equal(JSON.stringify(signup.body).includes('senha_hash'), false)
  const session = await browser.get('/api/v1/auth/sessao').expect(200)
  assert.equal(session.body.data.usuario.id, signup.body.data.usuario.id)
  const stored = await c.consultar('select token_hash from sessoes where usuario_id = $1', [signup.body.data.usuario.id])
  assert.equal(stored.rows[0].token_hash.length, 64)
  assert.equal(signup.headers['set-cookie'][0].includes(stored.rows[0].token_hash), false)
  await browser.patch('/api/v1/perfil').set(headers).send({ administrador: true }).expect(400)
  const profile = await browser.get('/api/v1/perfil').expect(200)
  assert.equal(profile.body.data.administrador, false)
  await browser.post('/api/v1/auth/logout').set(headers).send({}).expect(204)
  await browser.get('/api/v1/perfil').expect(401)
})

test('login, senha inválida, origem e sessão expirada', async (t) => {
  const c = await criarCenario(t)
  const headers = { Origin: c.config.appOrigin, 'X-ISAC-Client': 'web' }
  const browser = request.agent(c.app)
  await browser.post('/api/v1/auth/cadastro').set(headers)
    .send({ nome: 'Ana', email: 'ana@exemplo.com', senha: 'senha-forte-123' }).expect(201)
  await browser.post('/api/v1/auth/logout').set(headers).send({}).expect(204)
  await browser.post('/api/v1/auth/login').set(headers)
    .send({ email: 'ana@exemplo.com', senha: 'incorreta' }).expect(401)
  await browser.post('/api/v1/auth/login').set({ ...headers, Origin: 'https://outro.site' })
    .send({ email: 'ana@exemplo.com', senha: 'senha-forte-123' }).expect(403)
  await browser.post('/api/v1/auth/login').set(headers)
    .send({ email: 'ANA@EXEMPLO.COM', senha: 'senha-forte-123' }).expect(200)
  await c.consultar('update sessoes set expira_em = now() - interval \'1 second\'')
  await browser.get('/api/v1/perfil').expect(401)
})

test('cadastro duplicado e campos de privilégio são rejeitados', async (t) => {
  const c = await criarCenario(t)
  const body = { nome: 'Ana', email: 'ana@exemplo.com', senha: 'senha-forte-123' }
  await c.anonimo().post('/api/v1/auth/cadastro').send({ ...body, administrador: true }).expect(400)
  await c.anonimo().post('/api/v1/auth/cadastro').send(body).expect(201)
  const duplicate = await c.anonimo().post('/api/v1/auth/cadastro').send(body).expect(409)
  assert.equal(duplicate.body.error.code, 'EMAIL_EM_USO')
})

test('limita tentativas de login por IP', async (t) => {
  const c = await criarCenario(t)
  for (let i = 0; i < 10; i++) {
    await c.anonimo().post('/api/v1/auth/login').send({ email: 'nobody@exemplo.com', senha: 'incorreta' }).expect(401)
  }
  const limited = await c.anonimo().post('/api/v1/auth/login')
    .send({ email: 'nobody@exemplo.com', senha: 'incorreta' }).expect(429)
  assert.ok(limited.headers['retry-after'])
})

test('cookie de produção usa HttpOnly, Secure e SameSite', async (t) => {
  const c = await criarCenario(t)
  const app = createApp({ pool: c.pool, config: { ...c.config, appOrigin: 'https://market.example', production: true } })
  const signup = await request(app).post('/api/v1/auth/cadastro')
    .set('Origin', 'https://market.example').set('X-ISAC-Client', 'web')
    .send({ nome: 'Teste', email: 'seguro@exemplo.com', senha: 'senha-forte-123' }).expect(201)
  const cookie = signup.headers['set-cookie'][0]
  assert.match(cookie, /HttpOnly/)
  assert.match(cookie, /Secure/)
  assert.match(cookie, /SameSite=Lax/)
})
