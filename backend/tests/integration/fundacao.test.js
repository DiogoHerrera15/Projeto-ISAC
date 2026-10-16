import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { criarCenario } from '../helpers/cenario.js'
import { migrate } from '../../src/db/migrate.js'

test('instala schema isolado e inicia a API', async (t) => {
  const c = await criarCenario(t)
  const response = await request(c.app).get('/api/v1/health').expect(200)
  assert.deepEqual(response.body, { data: { status: 'ok' } })
  const tables = await c.consultar("select tablename from pg_tables where schemaname = current_schema()")
  assert.equal(tables.rows.length, 11)
})

test('segunda migração não reaplica alterações', async (t) => {
  const c = await criarCenario(t)
  const before = await c.consultar('select count(*)::int as count from schema_migrations')
  await c.migrate()
  const after = await c.consultar('select count(*)::int as count from schema_migrations')
  assert.equal(before.rows[0].count, 1)
  assert.equal(after.rows[0].count, 1)
})

test('falha na migração desfaz as alterações anteriores', async (t) => {
  const c = await criarCenario(t)
  const directory = await mkdtemp(join(tmpdir(), 'isac-migration-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  await writeFile(join(directory, '002_temp.sql'), 'create table tabela_temporaria (id integer);')
  await writeFile(join(directory, '003_falha.sql'), 'select * from tabela_inexistente;')
  const { rows: before } = await c.consultar('select current_schema() as schema')
  await assert.rejects(migrate(c.pool, { schema: before[0].schema, directory }))
  const result = await c.consultar("select to_regclass('tabela_temporaria') as tabela")
  assert.equal(result.rows[0].tabela, null)
})
