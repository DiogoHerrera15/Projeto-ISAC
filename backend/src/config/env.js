import { resolve } from 'node:path'

export function readConfig(env = process.env) {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL é obrigatória')
  // APP_ORIGIN aceita uma ou mais origens separadas por vírgula (ex.: localhost e o endereço do Codespace).
  const appOrigins = String(env.APP_ORIGIN ?? '').split(',').map((item) => item.trim()).map((item) => {
    try {
      const parsed = new URL(item)
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== item) throw new Error()
      return parsed.origin
    } catch {
      throw new Error('APP_ORIGIN deve ser uma origem HTTP(S) exata')
    }
  })
  const port = Number(env.PORT || 3001)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida')
  const sessionTtlSeconds = Number(env.SESSION_TTL_SECONDS || 604800)
  if (!Number.isInteger(sessionTtlSeconds) || sessionTtlSeconds < 60) throw new Error('SESSION_TTL_SECONDS inválido')
  // Quantos proxies confiáveis existem na frente da API (0 = acesso direto). Necessário
  // em hospedagens para o limite de tentativas enxergar o IP real de cada pessoa.
  const trustProxy = env.TRUST_PROXY ? Number(env.TRUST_PROXY) : 0
  if (!Number.isInteger(trustProxy) || trustProxy < 0 || trustProxy > 10) throw new Error('TRUST_PROXY inválido')
  return {
    databaseUrl: env.DATABASE_URL,
    migrationDatabaseUrl: env.MIGRATION_DATABASE_URL || env.DATABASE_URL,
    appOrigin: appOrigins[0],
    appOrigins,
    trustProxy,
    port,
    sessionTtlSeconds,
    production: env.NODE_ENV === 'production',
    uploadDir: env.UPLOAD_DIR || './uploads',
    frontendDist: env.FRONTEND_DIST ? resolve(env.FRONTEND_DIST) : null,
  }
}
