import { randomBytes, scrypt as callbackScrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(callbackScrypt)
const params = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const key = await scrypt(password, salt, 64, params)
  return `scrypt$v1$${salt.toString('hex')}$${key.toString('hex')}`
}

export async function verifyPassword(password, stored) {
  const parts = String(stored).split('$')
  if (parts.length !== 4 || parts[0] !== 'scrypt' || parts[1] !== 'v1') return false
  const salt = Buffer.from(parts[2], 'hex')
  const expected = Buffer.from(parts[3], 'hex')
  if (salt.length !== 16 || expected.length !== 64) return false
  const actual = await scrypt(password, salt, 64, params)
  return timingSafeEqual(actual, expected)
}
