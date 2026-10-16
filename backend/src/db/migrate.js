import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { withTransaction } from './transaction.js'

const migrationDir = fileURLToPath(new URL('../../migrations/', import.meta.url))

export async function migrate(pool, { schema = 'public', directory = migrationDir } = {}) {
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error('Schema inválido')
  const files = (await readdir(directory)).filter((name) => /^\d+_[\w-]+\.sql$/.test(name)).sort()
  return withTransaction(pool, async (client) => {
    await client.query('select pg_advisory_xact_lock(hashtext($1))', [`isac_migrations_${schema}`])
    await client.query(`SET LOCAL search_path TO "${schema}", public`)
    await client.query('create table if not exists schema_migrations (nome text primary key, aplicado_em timestamptz not null default now())')
    const { rows } = await client.query('select nome from schema_migrations')
    const applied = new Set(rows.map((row) => row.nome))
    for (const file of files) {
      if (applied.has(file)) continue
      const sql = await readFile(join(directory, file), 'utf8')
      await client.query(sql)
      await client.query('insert into schema_migrations(nome) values ($1)', [file])
    }
    return files.length
  })
}
