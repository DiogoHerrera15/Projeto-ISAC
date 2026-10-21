import { randomUUID, randomBytes } from 'node:crypto'
import request from 'supertest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createPool } from '../../src/db/pool.js'
import { migrate } from '../../src/db/migrate.js'
import { createApp } from '../../src/app.js'
import { tokenHash } from '../../src/modules/auth/tokens.js'

export async function criarCenario(t) {
  const url = process.env.TEST_DATABASE_URL
  if (!url || !new URL(url).pathname.endsWith('_test') || url === process.env.DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL deve apontar para um banco separado com sufixo _test')
  }
  const schema = `test_${randomUUID().replaceAll('-', '')}`
  const admin = createPool(url)
  await admin.query(`create schema "${schema}"`)
  const pool = createPool(url, { options: `-c search_path=${schema},public` })
  t.after(async () => {
    await pool.end()
    await admin.query(`drop schema "${schema}" cascade`)
    await admin.end()
  })
  const runMigration = () => migrate(pool, { schema })
  await runMigration()
  const uploadDir = await mkdtemp(join(tmpdir(), 'isac-images-'))
  t.after(() => rm(uploadDir, { recursive: true, force: true }))
  const config = { appOrigin: 'http://localhost:5173', sessionTtlSeconds: 604800, production: false, uploadDir }
  const app = createApp({ pool, config })
  const ids = {}
  const cookies = {}
  const roles = ['cliente', 'outroCliente', 'vendedorA', 'vendedorB', 'admin']
  for (const role of roles) {
    const user = await pool.query('insert into usuarios(email, senha_hash) values ($1, $2) returning id', [
      `${role.toLowerCase()}@fixture.local`, 'fixture-sem-login',
    ])
    const id = user.rows[0].id
    ids[role] = id
    await pool.query('insert into perfis(id, nome, telefone, administrador) values ($1, $2, $3, $4)', [
      id, role, '81999999999', role === 'admin',
    ])
    const token = randomBytes(32).toString('base64url')
    await pool.query("insert into sessoes(usuario_id, token_hash, expira_em) values ($1, $2, now() + interval '7 days')", [
      id, tokenHash(token),
    ])
    cookies[role] = `isac_session=${token}`
  }
  for (const [role, label] of [['vendedorA', 'Doces de A'], ['vendedorB', 'Artes de B']]) {
    const { rows: stores } = await pool.query(
      'insert into lojas(vendedor_id, nome) values ($1, $2) returning id', [ids[role], label],
    )
    const key = role === 'vendedorA' ? 'A' : 'B'
    ids[`loja${key}`] = stores[0].id
    const { rows: products } = await pool.query(
      'insert into produtos(loja_id, nome, preco, estoque) values ($1, $2, $3, $4) returning id',
      [stores[0].id, `Produto ${key}`, '50.00', 2],
    )
    ids[`produto${key}`] = products[0].id
  }
  const browser = (role) => Object.fromEntries(['get', 'post', 'put', 'patch', 'delete'].map((method) => [
    method,
    (path) => {
      const call = request(app)[method](path).set('Origin', config.appOrigin).set('X-ISAC-Client', 'web')
      if (role) call.set('Cookie', cookies[role])
      return call
    },
  ]))
  return {
    app,
    pool,
    config,
    ids,
    como: (role) => browser(role),
    anonimo: () => browser(null),
    migrate: runMigration,
    consultar: (sql, params) => pool.query(sql, params),
  }
}
