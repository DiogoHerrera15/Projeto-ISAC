import { readConfig } from '../src/config/env.js'
import { createPool } from '../src/db/pool.js'
import { migrate } from '../src/db/migrate.js'

const config = readConfig()
const pool = createPool(config.migrationDatabaseUrl)
try {
  const count = await migrate(pool)
  console.log(`${count} arquivo(s) de migração reconhecido(s).`)
} finally {
  await pool.end()
}
