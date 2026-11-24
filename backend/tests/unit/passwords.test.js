import test from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, verifyPassword } from '../../src/modules/auth/passwords.js'

test('hash is salted and verifies only the original password', async () => {
  const first = await hashPassword('senha-forte-123')
  const second = await hashPassword('senha-forte-123')
  assert.notEqual(first, second)
  assert.equal(await verifyPassword('senha-forte-123', first), true)
  assert.equal(await verifyPassword('senha-errada', first), false)
})

test('várias verificações simultâneas terminam todas (fila de vagas do scrypt)', async () => {
  const hash = await hashPassword('senha-forte-123')
  const senhas = ['senha-forte-123', 'errada-1', 'senha-forte-123', 'errada-2', 'senha-forte-123']
  const resultados = await Promise.all(senhas.map((senha) => verifyPassword(senha, hash)))
  assert.deepEqual(resultados, [true, false, true, false, true])
})
