import { randomBytes, scrypt as callbackScrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(callbackScrypt)
const params = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }

// Cada scrypt usa cerca de 128 MB. Limitar quantos rodam ao mesmo tempo evita
// estourar a memória de uma hospedagem pequena quando muita gente entra junto;
// os demais esperam na fila (a requisição só fica um pouco mais lenta).
const MAX_SIMULTANEOS = 2
let emUso = 0
const fila = []

async function comVaga(tarefa) {
  if (emUso >= MAX_SIMULTANEOS) await new Promise((liberar) => fila.push(liberar))
  else emUso += 1
  try {
    return await tarefa()
  } finally {
    const proximo = fila.shift()
    if (proximo) proximo() // a vaga passa direto para quem esperava
    else emUso -= 1
  }
}

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const key = await comVaga(() => scrypt(password, salt, 64, params))
  return `scrypt$v1$${salt.toString('hex')}$${key.toString('hex')}`
}

export async function verifyPassword(password, stored) {
  const parts = String(stored).split('$')
  if (parts.length !== 4 || parts[0] !== 'scrypt' || parts[1] !== 'v1') return false
  const salt = Buffer.from(parts[2], 'hex')
  const expected = Buffer.from(parts[3], 'hex')
  if (salt.length !== 16 || expected.length !== 64) return false
  const actual = await comVaga(() => scrypt(password, salt, 64, params))
  return timingSafeEqual(actual, expected)
}
