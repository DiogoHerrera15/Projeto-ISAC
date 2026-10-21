import { withTransaction } from '../../db/transaction.js'
import { HttpError } from '../../http/errors.js'
import { hashPassword, verifyPassword } from './passwords.js'
import { createSession, tokenHash } from './tokens.js'
import * as repository from './repository.js'

export async function register(pool, { nome, email, senha, telefone }, ttlSeconds) {
  const passwordHash = await hashPassword(senha)
  try {
    return await withTransaction(pool, async (client) => {
      const usuario = await repository.createUser(client, email, passwordHash)
      const perfil = await repository.createProfile(client, usuario.id, nome, telefone)
      const token = await createSession(client, usuario.id, ttlSeconds)
      return { usuario, perfil, token }
    })
  } catch (error) {
    if (error.code === '23505') throw new HttpError(409, 'EMAIL_EM_USO', 'Já existe uma conta com este e-mail.')
    throw error
  }
}

export async function login(pool, { email, senha }, ttlSeconds) {
  const user = await repository.findUserByEmail(pool, email)
  if (!user || !(await verifyPassword(senha, user.senha_hash))) {
    throw new HttpError(401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.')
  }
  return withTransaction(pool, async (client) => {
    const perfil = await repository.findProfile(client, user.id)
    const token = await createSession(client, user.id, ttlSeconds)
    return { usuario: { id: user.id, email: user.email }, perfil, token }
  })
}

export async function logout(db, token) {
  await repository.deleteSession(db, tokenHash(token))
}

export async function getSession(db, token) {
  const row = await repository.findSession(db, tokenHash(token))
  if (!row) return null
  return {
    sessaoId: row.sessao_id,
    usuario: { id: row.usuario_id, email: row.email },
    perfil: { id: row.usuario_id, nome: row.nome, telefone: row.telefone, administrador: row.administrador },
  }
}
