import test from 'node:test'
import assert from 'node:assert/strict'
import { authRateLimit } from '../../src/http/rateLimit.js'

// Simula uma requisição: devolve o erro passado ao next e um "terminar" que dispara o evento finish.
function chamar(middleware, { ip = '1.1.1.1', status = 200 } = {}) {
  const ouvintes = {}
  const res = { statusCode: status, set() {}, on: (evento, fn) => { ouvintes[evento] = fn } }
  let erro
  middleware({ ip, socket: {} }, res, (e) => { erro = e })
  return { erro, terminar: () => ouvintes.finish?.() }
}

test('conta toda tentativa e bloqueia ao passar do limite', () => {
  const limite = authRateLimit({ attempts: 2 })
  for (let i = 0; i < 2; i++) assert.equal(chamar(limite).erro, undefined)
  assert.equal(chamar(limite).erro?.code, 'LIMITE_REQUISICOES')
  assert.equal(chamar(limite, { ip: '2.2.2.2' }).erro, undefined)
})

test('countSuccess=false não gasta o limite com logins que deram certo', () => {
  const limite = authRateLimit({ attempts: 2, countSuccess: false })
  for (let i = 0; i < 6; i++) {
    const { erro, terminar } = chamar(limite, { status: 200 })
    assert.equal(erro, undefined)
    terminar()
  }
  for (let i = 0; i < 2; i++) {
    const { erro, terminar } = chamar(limite, { status: 401 })
    assert.equal(erro, undefined)
    terminar()
  }
  assert.equal(chamar(limite, { status: 401 }).erro?.code, 'LIMITE_REQUISICOES')
})

test('a janela vencida libera o IP novamente', () => {
  let agora = 0
  const limite = authRateLimit({ attempts: 1, windowMs: 1000, now: () => agora })
  assert.equal(chamar(limite).erro, undefined)
  assert.equal(chamar(limite).erro?.code, 'LIMITE_REQUISICOES')
  agora = 1001
  assert.equal(chamar(limite).erro, undefined)
})
