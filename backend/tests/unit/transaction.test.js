import test from 'node:test'
import assert from 'node:assert/strict'
import { withTransaction } from '../../src/db/transaction.js'

function poolFalso({ rollbackFalha = false } = {}) {
  const client = {
    comandos: [],
    liberado: undefined,
    async query(sql) {
      this.comandos.push(sql)
      if (sql === 'ROLLBACK' && rollbackFalha) throw new Error('rollback falhou')
    },
    release(descartar) { this.liberado = descartar ?? false },
  }
  return { client, pool: { connect: async () => client } }
}

test('confirma e devolve a conexão quando tudo dá certo', async () => {
  const { client, pool } = poolFalso()
  assert.equal(await withTransaction(pool, async () => 'ok'), 'ok')
  assert.deepEqual(client.comandos, ['BEGIN', 'COMMIT'])
  assert.equal(client.liberado, false)
})

test('desfaz e propaga o erro original', async () => {
  const { client, pool } = poolFalso()
  await assert.rejects(withTransaction(pool, async () => { throw new Error('original') }), { message: 'original' })
  assert.deepEqual(client.comandos, ['BEGIN', 'ROLLBACK'])
  assert.equal(client.liberado, false)
})

test('se o ROLLBACK falhar, o erro original é mantido e a conexão é descartada', async () => {
  const { client, pool } = poolFalso({ rollbackFalha: true })
  await assert.rejects(withTransaction(pool, async () => { throw new Error('original') }), { message: 'original' })
  assert.equal(client.liberado, true)
})
