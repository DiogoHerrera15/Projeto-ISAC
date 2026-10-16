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
