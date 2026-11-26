import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { criarCenario } from '../helpers/cenario.js'

const APP = { Origin: 'capacitor://localhost', 'X-ISAC-Client': 'app' }
const SENHA = 'senha-forte-123'

async function cadastrarNoApp(c, email = 'ana@exemplo.com') {
  const resposta = await request(c.app).post('/api/v1/auth/cadastro').set(APP)
    .send({ nome: 'Ana', email, senha: SENHA }).expect(201)
  return resposta
}

const comToken = (c, metodo, caminho, token) => request(c.app)[metodo](caminho).set(APP).set('Authorization', `Bearer ${token}`)

test('app recebe o token no corpo, sem cookie, e usa Authorization nas chamadas', async (t) => {
  const c = await criarCenario(t)
  const cadastro = await cadastrarNoApp(c)
  assert.equal(cadastro.headers['set-cookie'], undefined)
  const { token } = cadastro.body.data
  assert.match(token, /^[A-Za-z0-9_-]{43}$/)

  const perfil = await comToken(c, 'get', '/api/v1/perfil', token).expect(200)
  assert.equal(perfil.body.data.nome, 'Ana')
  await request(c.app).get('/api/v1/perfil').set(APP).expect(401) // sem token
  await comToken(c, 'get', '/api/v1/perfil', 'x'.repeat(43)).expect(401) // token que não existe

  const login = await request(c.app).post('/api/v1/auth/login').set(APP).send({ email: 'ana@exemplo.com', senha: SENHA }).expect(200)
  assert.equal(login.headers['set-cookie'], undefined)
  assert.notEqual(login.body.data.token, token) // cada login é uma sessão própria

  await comToken(c, 'post', '/api/v1/auth/logout', token).send({}).expect(204)
  await comToken(c, 'get', '/api/v1/perfil', token).expect(401)
  await comToken(c, 'get', '/api/v1/perfil', login.body.data.token).expect(200) // a outra sessão segue valendo
})

test('o app faz o fluxo autenticado de escrita (carrinho e troca de senha) com o token', async (t) => {
  const c = await criarCenario(t)
  const { token } = (await cadastrarNoApp(c)).body.data
  await comToken(c, 'put', `/api/v1/carrinho/itens/${c.ids.produtoA}`, token).send({ quantidade: 1 }).expect(200)
  const carrinho = await comToken(c, 'get', '/api/v1/carrinho', token).expect(200)
  assert.equal(carrinho.body.data.length, 1)
  await comToken(c, 'post', '/api/v1/auth/senha', token).send({ senhaAtual: SENHA, novaSenha: 'outra-senha-456' }).expect(204)
  await comToken(c, 'get', '/api/v1/perfil', token).expect(200) // a sessão em uso continua
})

test('no modo app o cookie é ignorado, mesmo que seja válido', async (t) => {
  const c = await criarCenario(t)
  // Sessão do site, criada normalmente: o servidor devolve o cookie.
  const site = await request(c.app).post('/api/v1/auth/cadastro')
    .set({ Origin: c.config.appOrigin, 'X-ISAC-Client': 'web' })
    .send({ nome: 'Ana', email: 'ana@exemplo.com', senha: SENHA }).expect(201)
  const cookie = site.headers['set-cookie'][0].split(';')[0]
  await request(c.app).get('/api/v1/perfil').set('Cookie', cookie).expect(200)
  // O mesmo cookie, numa requisição que se declara app e não manda Bearer, não autentica.
  await request(c.app).get('/api/v1/perfil').set(APP).set('Cookie', cookie).expect(401)
})

test('origem e tipo de cliente precisam combinar (site com web, app com app)', async (t) => {
  const c = await criarCenario(t)
  const corpo = { nome: 'Ana', email: 'ana@exemplo.com', senha: SENHA }
  await request(c.app).post('/api/v1/auth/cadastro').set({ Origin: c.config.appOrigin, 'X-ISAC-Client': 'app' }).send(corpo).expect(403)
  await request(c.app).post('/api/v1/auth/cadastro').set({ Origin: 'capacitor://localhost', 'X-ISAC-Client': 'web' }).send(corpo).expect(403)
  await request(c.app).post('/api/v1/auth/cadastro').set({ Origin: 'https://outro.site', 'X-ISAC-Client': 'app' }).send(corpo).expect(403)
  await request(c.app).post('/api/v1/auth/cadastro').set({ 'X-ISAC-Client': 'app' }).send(corpo).expect(403)
  await request(c.app).post('/api/v1/auth/cadastro').set({ Origin: c.config.appOrigin, 'X-ISAC-Client': 'web' }).send(corpo).expect(201)
})

test('CORS só é liberado para a origem do aplicativo', async (t) => {
  const c = await criarCenario(t)
  const preflight = await request(c.app).options('/api/v1/auth/login')
    .set('Origin', 'capacitor://localhost').set('Access-Control-Request-Method', 'POST')
    .set('Access-Control-Request-Headers', 'authorization,content-type,x-isac-client,idempotency-key')
  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers['access-control-allow-origin'], 'capacitor://localhost')
  assert.match(preflight.headers['access-control-allow-headers'], /Authorization/)
  assert.match(preflight.headers['access-control-allow-headers'], /Idempotency-Key/)
  assert.equal(preflight.headers['access-control-allow-credentials'], undefined)

  const leitura = await request(c.app).get('/api/v1/health').set('Origin', 'capacitor://localhost').expect(200)
  assert.equal(leitura.headers['access-control-allow-origin'], 'capacitor://localhost')

  for (const origem of ['https://outro.site', c.config.appOrigin]) {
    const negado = await request(c.app).options('/api/v1/auth/login').set('Origin', origem).set('Access-Control-Request-Method', 'POST')
    assert.equal(negado.headers['access-control-allow-origin'], undefined)
    const get = await request(c.app).get('/api/v1/health').set('Origin', origem).expect(200)
    assert.equal(get.headers['access-control-allow-origin'], undefined)
  }
})
