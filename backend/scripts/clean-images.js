import { readConfig } from '../src/config/env.js'
import { createPool } from '../src/db/pool.js'
import { cleanOrphanImages } from '../src/modules/imagens/cleanup.js'

const config = readConfig()
const pool = createPool(config.migrationDatabaseUrl)
try {
  const count = await cleanOrphanImages(pool, config.uploadDir)
  console.log(`${count} imagem(ns) órfã(s) removida(s).`)
} finally {
  await pool.end()
}
