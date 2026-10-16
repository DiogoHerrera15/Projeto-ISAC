import { readConfig } from '../src/config/env.js'
import { createPool } from '../src/db/pool.js'

const config = readConfig()
const pool = createPool(config.migrationDatabaseUrl)
try {
  const { rowCount } = await pool.query('delete from sessoes where expira_em <= now()')
  console.log(`${rowCount} sessão(ões) expirada(s) removida(s).`)
} finally {
  await pool.end()
}
