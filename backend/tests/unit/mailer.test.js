import test from 'node:test'
import assert from 'node:assert/strict'
import { createMailer } from '../../src/mail/mailer.js'
import { readConfig } from '../../src/config/env.js'

function logFalso() {
  const linhas = { log: [], warn: [] }
  return { linhas, log: { log: (m) => linhas.log.push(m), warn: (m) => linhas.warn.push(m) } }
}
const mensagem = { to: 'ana@exemplo.com', subject: 'Teste', text: 'link secreto https://x/redefinir-senha?token=abc' }

test('em desenvolvimento, sem SMTP, o e-mail é escrito no terminal', async () => {
  const { linhas, log } = logFalso()
  await createMailer({ production: false, smtpUrl: null }, { log }).send(mensagem)
  assert.equal(linhas.log.length, 1)
  assert.match(linhas.log[0], /ana@exemplo\.com/)
  assert.match(linhas.log[0], /token=abc/)
})

test('em produção, sem SMTP, o token não vai para o log', async () => {
  const { linhas, log } = logFalso()
  await createMailer({ production: true, smtpUrl: null }, { log }).send(mensagem)
  assert.deepEqual(linhas.log, [])
  assert.equal(linhas.warn.length, 1)
  assert.doesNotMatch(linhas.warn[0], /token/)
})

test('configuração de e-mail e validade do link', () => {
  const base = { DATABASE_URL: 'postgres://localhost/isac', APP_ORIGIN: 'http://localhost:5173' }
  const padrao = readConfig(base)
  assert.equal(padrao.resetTtlSeconds, 3600)
  assert.equal(padrao.smtpUrl, null)
  assert.match(padrao.mailFrom, /ISAC Market/)
  assert.equal(readConfig({ ...base, SMTP_URL: 'smtp://localhost:25', RESET_TTL_SECONDS: '900' }).resetTtlSeconds, 900)
  assert.throws(() => readConfig({ ...base, RESET_TTL_SECONDS: '10' }), /RESET_TTL_SECONDS/)
  assert.throws(() => readConfig({ ...base, RESET_TTL_SECONDS: 'abc' }), /RESET_TTL_SECONDS/)
})
