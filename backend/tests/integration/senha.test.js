import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { criarCenario } from '../helpers/cenario.js'

const SENHA = 'senha-forte-123'
const NOVA = 'outra-senha-456'

// Cadastra uma conta e devolve um "navegador" (agente com cookie) já logado.
async function cadastrar(c, email = 'ana@exemplo.com') {
  const headers = { Origin: c.config.appOrigin, 'X-ISAC-Client': 'web' }
  const navegador = request.agent(c.app)
  await navegador.post('/api/v1/auth/cadastro').set(headers).send({ nome: 'Ana', email, senha: SENHA }).expect(201)
  return { navegador, headers }
}

async function entrar(c, senha, email = 'ana@exemplo.com') {
  const headers = { Origin: c.config.appOrigin, 'X-ISAC-Client': 'web' }
  const navegador = request.agent(c.app)
  const resposta = await navegador.post('/api/v1/auth/login').set(headers).send({ email, senha })
  return { navegador, headers, status: resposta.status }
}

const tokenDoEmail = (mensagem) => mensagem.text.match(/redefinir-senha\?token=([A-Za-z0-9_-]{43})/)[1]

test('troca de senha exige a atual, encerra as outras sessões e mantém a atual', async (t) => {
  const c = await criarCenario(t)
  const { navegador, headers } = await cadastrar(c)
  const outro = await entrar(c, SENHA) // segunda sessão (outro aparelho)
  assert.equal(outro.status, 200)

  await navegador.post('/api/v1/auth/senha').set(headers).send({ senhaAtual: 'errada-123', novaSenha: NOVA }).expect(400)
  await navegador.post('/api/v1/auth/senha').set(headers).send({ senhaAtual: SENHA, novaSenha: SENHA }).expect(400)
  await navegador.post('/api/v1/auth/senha').set(headers).send({ senhaAtual: SENHA, novaSenha: 'curta' }).expect(400)
  await navegador.post('/api/v1/auth/senha').set(headers).send({ senhaAtual: SENHA, novaSenha: NOVA, extra: 1 }).expect(400)
  await request(c.app).post('/api/v1/auth/senha').set(headers).send({ senhaAtual: SENHA, novaSenha: NOVA }).expect(401)

  await navegador.post('/api/v1/auth/senha').set(headers).send({ senhaAtual: SENHA, novaSenha: NOVA }).expect(204)
  await navegador.get('/api/v1/perfil').expect(200) // quem trocou continua logado
  await outro.navegador.get('/api/v1/perfil').expect(401) // a outra sessão caiu
  assert.equal((await entrar(c, SENHA)).status, 401) // a senha antiga não vale mais
  assert.equal((await entrar(c, NOVA)).status, 200)
})

test('recuperação: resposta igual para e-mail existente ou não, e o link troca a senha uma única vez', async (t) => {
  const c = await criarCenario(t)
  const { navegador, headers } = await cadastrar(c)

  const existente = await request(c.app).post('/api/v1/auth/recuperacao').set(headers).send({ email: 'ANA@exemplo.com' }).expect(200)
  const inexistente = await request(c.app).post('/api/v1/auth/recuperacao').set(headers).send({ email: 'ninguem@exemplo.com' }).expect(200)
  assert.deepEqual(existente.body, inexistente.body)
  await new Promise((resolve) => setImmediate(resolve)) // o envio acontece em segundo plano
  assert.equal(c.mailer.enviados.length, 1)
  assert.equal(c.mailer.enviados[0].to, 'ana@exemplo.com')

  // O token só existe no e-mail: no banco fica apenas o hash.
  const token = tokenDoEmail(c.mailer.enviados[0])
  const salvo = await c.consultar('select token_hash from redefinicoes_senha')
  assert.equal(salvo.rows.length, 1)
  assert.notEqual(salvo.rows[0].token_hash, token)
  assert.equal(salvo.rows[0].token_hash.length, 64)

  await request(c.app).post('/api/v1/auth/redefinicao').set(headers).send({ token, novaSenha: 'curta' }).expect(400)
  await request(c.app).post('/api/v1/auth/redefinicao').set(headers).send({ token, novaSenha: NOVA }).expect(204)
  assert.equal((await entrar(c, SENHA)).status, 401)
  assert.equal((await entrar(c, NOVA)).status, 200)
  await navegador.get('/api/v1/perfil').expect(401) // sessões antigas caem

  const reuso = await request(c.app).post('/api/v1/auth/redefinicao').set(headers).send({ token, novaSenha: 'mais-uma-789' }).expect(400)
  assert.equal(reuso.body.error.code, 'TOKEN_INVALIDO')
})

test('link inválido, expirado ou substituído por um pedido mais novo é recusado', async (t) => {
  const c = await criarCenario(t)
  const { headers } = await cadastrar(c)
  const pedir = async () => {
    await request(c.app).post('/api/v1/auth/recuperacao').set(headers).send({ email: 'ana@exemplo.com' }).expect(200)
    await new Promise((resolve) => setImmediate(resolve))
    return tokenDoEmail(c.mailer.enviados.at(-1))
  }
  const redefinir = (token) => request(c.app).post('/api/v1/auth/redefinicao').set(headers).send({ token, novaSenha: NOVA })

  assert.equal((await redefinir('x'.repeat(43))).status, 400)
  assert.equal((await redefinir('curto')).status, 400)

  const expirado = await pedir()
  await c.consultar("update redefinicoes_senha set expira_em = now() - interval '1 second'")
  assert.equal((await redefinir(expirado)).body.error.code, 'TOKEN_INVALIDO')

  // O segundo pedido só é aceito depois do intervalo mínimo; ele invalida o primeiro.
  await c.consultar("update redefinicoes_senha set criado_em = now() - interval '2 minutes'")
  const antigo = await pedir()
  await c.consultar("update redefinicoes_senha set criado_em = now() - interval '2 minutes'")
  const novo = await pedir()
  assert.notEqual(antigo, novo)
  assert.equal((await redefinir(antigo)).status, 400)
  assert.equal((await redefinir(novo)).status, 204)
})

test('pedidos seguidos não geram vários e-mails e trocar a senha invalida links abertos', async (t) => {
  const c = await criarCenario(t)
  const { navegador, headers } = await cadastrar(c)
  for (let i = 0; i < 3; i++) {
    await request(c.app).post('/api/v1/auth/recuperacao').set(headers).send({ email: 'ana@exemplo.com' }).expect(200)
  }
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(c.mailer.enviados.length, 1)
  const token = tokenDoEmail(c.mailer.enviados[0])

  await navegador.post('/api/v1/auth/senha').set(headers).send({ senhaAtual: SENHA, novaSenha: NOVA }).expect(204)
  const resposta = await request(c.app).post('/api/v1/auth/redefinicao').set(headers).send({ token, novaSenha: 'mais-uma-789' })
  assert.equal(resposta.status, 400)
})

test('recuperação valida o e-mail, exige origem permitida e limita pedidos por IP', async (t) => {
  const c = await criarCenario(t)
  const headers = { Origin: c.config.appOrigin, 'X-ISAC-Client': 'web' }
  await request(c.app).post('/api/v1/auth/recuperacao').set(headers).send({ email: 'nao-e-email' }).expect(400)
  await request(c.app).post('/api/v1/auth/recuperacao').send({ email: 'ana@exemplo.com' }).expect(403)
  // O limite é de 5 pedidos por IP e o e-mail inválido acima já contou 1 (a validação vem depois do limite).
  for (let i = 0; i < 4; i++) {
    await request(c.app).post('/api/v1/auth/recuperacao').set(headers).send({ email: `pessoa${i}@exemplo.com` }).expect(200)
  }
  const limitado = await request(c.app).post('/api/v1/auth/recuperacao').set(headers).send({ email: 'outra@exemplo.com' }).expect(429)
  assert.ok(limitado.headers['retry-after'])
})
