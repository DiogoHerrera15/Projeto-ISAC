import { readConfig } from '../src/config/env.js'
import { createPool } from '../src/db/pool.js'
import { migrate } from '../src/db/migrate.js'

const config = readConfig()
const pool = createPool(config.migrationDatabaseUrl)
try {
  const { total, aplicadas } = await migrate(pool)
  console.log(aplicadas.length
    ? `${aplicadas.length} migração(ões) aplicada(s): ${aplicadas.join(', ')}.`
    : `Banco já está atualizado (${total} migração(ões) conhecida(s)).`)
} finally {
  await pool.end()
}
