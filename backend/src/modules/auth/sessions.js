import { createHash, randomBytes } from 'node:crypto'
import { HttpError } from '../../http/errors.js'

const COOKIE = 'isac_session'

export function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(client, userId, ttlSeconds) {
  const token = randomBytes(32).toString('base64url')
  await client.query(
    "insert into sessoes(usuario_id, token_hash, expira_em) values ($1, $2, now() + $3 * interval '1 second')",
    [userId, tokenHash(token), ttlSeconds],
  )
  return token
}

export function setSessionCookie(res, token, config) {
  res.cookie(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: config.production, path: '/', maxAge: config.sessionTtlSeconds * 1000,
  })
}

export function clearSessionCookie(res, config) {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'lax', secure: config.production, path: '/' })
}

export function readSessionToken(req) {
  const found = (req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))
  const token = found?.slice(COOKIE.length + 1)
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null
}

export async function loadSession(req, pool) {
  const token = readSessionToken(req)
  if (!token) return null
  const { rows } = await pool.query(
    `select s.id as sessao_id, u.id as usuario_id, u.email, p.nome, p.telefone, p.administrador
     from sessoes s join usuarios u on u.id = s.usuario_id join perfis p on p.id = u.id
     where s.token_hash = $1 and s.expira_em > now()`,
    [tokenHash(token)],
  )
  if (!rows.length) return null
  const row = rows[0]
  return {
    sessaoId: row.sessao_id,
    usuario: { id: row.usuario_id, email: row.email },
    perfil: { id: row.usuario_id, nome: row.nome, telefone: row.telefone, administrador: row.administrador },
  }
}

export function requireSession(pool) {
  return async (req, _res, next) => {
    try {
      req.session = await loadSession(req, pool)
      if (!req.session) throw new HttpError(401, 'NAO_AUTENTICADO', 'Entre na sua conta.')
      next()
    } catch (error) { next(error) }
  }
}

export function requireAdmin(_req, _res, next) {
  if (!_req.session?.perfil?.administrador) return next(new HttpError(403, 'SEM_PERMISSAO', 'Acesso restrito à administração.'))
  next()
}
