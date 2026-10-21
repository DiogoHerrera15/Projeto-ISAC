import { createHash, randomBytes } from 'node:crypto'
import { createSessionRecord } from './repository.js'

export function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(db, userId, ttlSeconds) {
  const token = randomBytes(32).toString('base64url')
  await createSessionRecord(db, userId, tokenHash(token), ttlSeconds)
  return token
}
