import test from 'node:test'
import assert from 'node:assert/strict'
import { readConfig } from '../../src/config/env.js'

test('config requires database and exact app origin', () => {
  assert.throws(() => readConfig({ APP_ORIGIN: 'http://localhost:5173' }), /DATABASE_URL/)
  assert.throws(() => readConfig({ DATABASE_URL: 'postgres://localhost/isac', APP_ORIGIN: '*' }), /APP_ORIGIN/)
  const config = readConfig({ DATABASE_URL: 'postgres://localhost/isac', APP_ORIGIN: 'http://localhost:5173' })
  assert.equal(config.port, 3001)
  assert.equal(config.appOrigin, 'http://localhost:5173')
})

test('APP_ORIGIN aceita lista de origens exatas e TRUST_PROXY é validado', () => {
  const base = { DATABASE_URL: 'postgres://localhost/isac' }
  const config = readConfig({ ...base, APP_ORIGIN: 'http://localhost:5173, https://app.exemplo.dev', TRUST_PROXY: '1' })
  assert.deepEqual(config.appOrigins, ['http://localhost:5173', 'https://app.exemplo.dev'])
  assert.equal(config.appOrigin, 'http://localhost:5173')
  assert.equal(config.trustProxy, 1)
  assert.equal(readConfig({ ...base, APP_ORIGIN: 'http://localhost:5173' }).trustProxy, 0)
  assert.throws(() => readConfig({ ...base, APP_ORIGIN: 'http://localhost:5173,https://x.dev/' }), /APP_ORIGIN/)
  assert.throws(() => readConfig({ ...base, APP_ORIGIN: 'http://localhost:5173', TRUST_PROXY: 'sim' }), /TRUST_PROXY/)
})
