import { readConfig } from './config/env.js'
import { createPool } from './db/pool.js'
import { createApp } from './app.js'
import { cleanExpiredSessions } from './modules/auth/service.js'
import { cleanOrphanImages } from './modules/imagens/cleanup.js'

const config = readConfig()
const pool = createPool(config.databaseUrl)
const server = createApp({ pool, config }).listen(config.port, () => {
  console.log(`ISAC Market API em http://localhost:${config.port}`)
})

// Limpeza periódica: sessões vencidas e fotos enviadas que nunca foram ligadas a
// um produto. Antes só existia como script manual (npm run sessions:clean / images:clean).
const LIMPEZA_A_CADA_MS = 6 * 60 * 60 * 1000
async function limpar() {
  try {
    const sessoes = await cleanExpiredSessions(pool)
    const imagens = await cleanOrphanImages(pool, config.uploadDir)
    if (sessoes || imagens) console.log(`Limpeza: ${sessoes} sessão(ões) e ${imagens} imagem(ns) órfã(s) removida(s).`)
  } catch (error) {
    console.error('Falha na limpeza periódica:', error.message)
  }
}
limpar()
const limpeza = setInterval(limpar, LIMPEZA_A_CADA_MS)
limpeza.unref()

let encerrando = false
async function shutdown() {
  if (encerrando) return
  encerrando = true
  clearInterval(limpeza)
  // Se alguma conexão não encerrar, força a saída em vez de travar o deploy.
  setTimeout(() => process.exit(1), 10_000).unref()
  server.closeIdleConnections?.()
  await new Promise((resolve) => server.close(resolve))
  await pool.end()
}
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
