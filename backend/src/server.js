import { readConfig } from './config/env.js'
import { createPool } from './db/pool.js'
import { createApp } from './app.js'

const config = readConfig()
const pool = createPool(config.databaseUrl)
const server = createApp({ pool, config }).listen(config.port, () => {
  console.log(`ISAC Market API em http://localhost:${config.port}`)
})

async function shutdown() {
  server.close()
  await pool.end()
}
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
