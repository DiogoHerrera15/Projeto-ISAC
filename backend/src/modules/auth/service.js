import { withTransaction } from '../../db/transaction.js'
import { HttpError } from '../../http/errors.js'
import { hashPassword, verifyPassword } from './passwords.js'
import { createSession } from './sessions.js'

export async function register(pool, { nome, email, senha, telefone }, ttlSeconds) {
  const passwordHash = await hashPassword(senha)
  try {
    return await withTransaction(pool, async (client) => {
      const user = await client.query('insert into usuarios(email, senha_hash) values ($1, $2) returning id, email', [email, passwordHash])
      const usuario = user.rows[0]
      const profile = await client.query(
        'insert into perfis(id, nome, telefone) values ($1, $2, $3) returning id, nome, telefone, administrador',
        [usuario.id, nome, telefone],
      )
      const token = await createSession(client, usuario.id, ttlSeconds)
      return { usuario, perfil: profile.rows[0], token }
    })
  } catch (error) {
    if (error.code === '23505') throw new HttpError(409, 'EMAIL_EM_USO', 'Já existe uma conta com este e-mail.')
    throw error
  }
}

export async function login(pool, { email, senha }, ttlSeconds) {
  const { rows } = await pool.query('select id, email, senha_hash from usuarios where email = $1', [email])
  if (!rows.length || !(await verifyPassword(senha, rows[0].senha_hash))) {
    throw new HttpError(401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.')
  }
  return withTransaction(pool, async (client) => {
    const { rows: profiles } = await client.query('select id, nome, telefone, administrador from perfis where id = $1', [rows[0].id])
    const token = await createSession(client, rows[0].id, ttlSeconds)
    return { usuario: { id: rows[0].id, email: rows[0].email }, perfil: profiles[0], token }
  })
}
