import { withTransaction } from '../../db/transaction.js'
import { HttpError } from '../../http/errors.js'
import { randomBytes } from 'node:crypto'
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

// Conta inexistente também gasta o tempo de uma verificação de senha; senão a
// resposta mais rápida revelaria quais e-mails têm cadastro.
let hashFalso
async function verificarSenhaFalsa(senha) {
  hashFalso ??= hashPassword(randomBytes(16).toString('hex'))
  await verifyPassword(senha, await hashFalso)
}

export async function login(pool, { email, senha }, ttlSeconds) {
  const user = await repository.findUserByEmail(pool, email)
  if (!user) await verificarSenhaFalsa(senha)
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

export async function cleanExpiredSessions(db) {
  return repository.deleteExpiredSessions(db)
}

export async function cleanExpiredResets(db) {
  return repository.deleteExpiredResets(db)
}

// ---------- Troca e recuperação de senha ----------
const RESET_COOLDOWN_SECONDS = 60
const RESET_TOKEN_FORMAT = /^[A-Za-z0-9_-]{43}$/
const invalidResetToken = () => new HttpError(400, 'TOKEN_INVALIDO', 'Este link é inválido ou expirou. Peça um novo.')

// Quem está logado troca a senha informando a atual. As outras sessões da conta
// são encerradas (se a senha vazou, quem a tinha perde o acesso); a atual continua.
export async function changePassword(pool, { userId, currentToken }, { senhaAtual, novaSenha }) {
  const user = await repository.findUserById(pool, userId)
  if (!user || !(await verifyPassword(senhaAtual, user.senha_hash))) {
    throw new HttpError(400, 'SENHA_ATUAL_INCORRETA', 'A senha atual está incorreta.')
  }
  if (senhaAtual === novaSenha) {
    throw new HttpError(400, 'ENTRADA_INVALIDA', 'A nova senha deve ser diferente da atual.')
  }
  const hash = await hashPassword(novaSenha)
  await withTransaction(pool, async (client) => {
    await repository.updatePasswordHash(client, userId, hash)
    await repository.deleteOtherSessions(client, userId, tokenHash(currentToken))
    await repository.invalidateResets(client, userId)
  })
}

// Sempre responde igual, exista ou não a conta, para não revelar quais e-mails têm cadastro.
// O envio acontece em segundo plano; uma falha do servidor de e-mail só vai para o log.
export async function requestPasswordReset(pool, mailer, config, { email }) {
  const user = await repository.findUserByEmail(pool, email)
  if (!user) return
  // Pedidos em sequência não geram novos e-mails (evita usar o sistema para entupir a caixa de alguém).
  if (await repository.recentResetExists(pool, user.id, RESET_COOLDOWN_SECONDS)) return
  const token = randomBytes(32).toString('base64url')
  const ttlSeconds = config.resetTtlSeconds ?? 3600
  await withTransaction(pool, async (client) => {
    await repository.invalidateResets(client, user.id)
    await repository.createReset(client, user.id, tokenHash(token), ttlSeconds)
  })
  const link = `${config.appOrigin}/redefinir-senha?token=${token}`
  const minutes = Math.max(1, Math.round(ttlSeconds / 60))
  Promise.resolve()
    .then(() => mailer.send({
      to: user.email,
      subject: 'Redefinição de senha - ISAC Market',
      text: `Recebemos um pedido para redefinir a senha da sua conta no ISAC Market.\n\n`
        + `Abra o link abaixo para escolher uma nova senha (vale por ${minutes} minutos e só pode ser usado uma vez):\n\n${link}\n\n`
        + 'Se não foi você, ignore este e-mail: sua senha continua a mesma.\n',
    }))
    .catch((error) => console.error('Falha ao enviar e-mail de recuperação:', error.message))
}

export async function resetPassword(pool, { token, novaSenha }) {
  if (!RESET_TOKEN_FORMAT.test(token)) throw invalidResetToken()
  const hashed = tokenHash(token)
  // Confere antes de gastar o scrypt (caro) com um token qualquer.
  if (!(await repository.findValidReset(pool, hashed))) throw invalidResetToken()
  const hash = await hashPassword(novaSenha)
  await withTransaction(pool, async (client) => {
    const userId = await repository.claimReset(client, hashed)
    if (!userId) throw invalidResetToken()
    await repository.updatePasswordHash(client, userId, hash)
    await repository.invalidateResets(client, userId)
    await repository.deleteUserSessions(client, userId)
  })
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
