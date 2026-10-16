import { readConfig } from '../src/config/env.js'
import { createPool } from '../src/db/pool.js'
import { seedDemo } from '../src/db/seedDemo.js'

const config = readConfig()
const database = new URL(config.databaseUrl)
if (process.argv[2] !== '--demo' || config.production || !['localhost', '127.0.0.1'].includes(database.hostname)) {
  console.error('Seed fictício somente para banco local em desenvolvimento: npm run db:seed -- --demo')
  process.exitCode = 2
} else {
  const pool = createPool(config.databaseUrl)
  try {
    await seedDemo(pool)
    console.log('Contas, lojas e produtos fictícios preparados (senha local: isac1234).')
  } finally {
    await pool.end()
  }
}
