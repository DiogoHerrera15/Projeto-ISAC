import { resolve } from 'node:path'

export function readConfig(env = process.env) {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL é obrigatória')
  let appOrigin
  try {
    const parsed = new URL(env.APP_ORIGIN)
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== env.APP_ORIGIN) throw new Error()
    appOrigin = parsed.origin
  } catch {
    throw new Error('APP_ORIGIN deve ser uma origem HTTP(S) exata')
  }
  const port = Number(env.PORT || 3001)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida')
  const sessionTtlSeconds = Number(env.SESSION_TTL_SECONDS || 604800)
  if (!Number.isInteger(sessionTtlSeconds) || sessionTtlSeconds < 60) throw new Error('SESSION_TTL_SECONDS inválido')
  return {
    databaseUrl: env.DATABASE_URL,
    migrationDatabaseUrl: env.MIGRATION_DATABASE_URL || env.DATABASE_URL,
    appOrigin,
    port,
    sessionTtlSeconds,
    production: env.NODE_ENV === 'production',
    uploadDir: env.UPLOAD_DIR || './uploads',
    frontendDist: env.FRONTEND_DIST ? resolve(env.FRONTEND_DIST) : null,
  }
}
