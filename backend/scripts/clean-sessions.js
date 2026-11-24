import { readConfig } from '../src/config/env.js'
import { createPool } from '../src/db/pool.js'
import { cleanExpiredSessions } from '../src/modules/auth/service.js'

const config = readConfig()
const pool = createPool(config.migrationDatabaseUrl)
try {
  const count = await cleanExpiredSessions(pool)
  console.log(`${count} sessão(ões) expirada(s) removida(s).`)
} finally {
  await pool.end()
}
