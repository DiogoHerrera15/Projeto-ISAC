import { HttpError } from '../../http/errors.js'
import { getSession } from './service.js'

const COOKIE = 'isac_session'

export function setSessionCookie(res, token, config) {
  res.cookie(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: config.production, path: '/', maxAge: config.sessionTtlSeconds * 1000,
  })
}

export function clearSessionCookie(res, config) {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'lax', secure: config.production, path: '/' })
}

// O aplicativo instalado se identifica com X-ISAC-Client: app e manda o token em
// Authorization: Bearer. Nesse modo o cookie é ignorado de propósito: assim um
// site malicioso nunca consegue agir em nome do usuário usando o cookie do navegador.
export function isAppClient(req) {
  return req.headers['x-isac-client'] === 'app'
}

export function readSessionToken(req) {
  if (isAppClient(req)) {
    const bearer = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization || '')
    return bearer ? bearer[1] : null
  }
  const found = (req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))
  const token = found?.slice(COOKIE.length + 1)
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null
}

export async function loadSession(req, pool) {
  const token = readSessionToken(req)
  return token ? getSession(pool, token) : null
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

export function requireAdmin(req, _res, next) {
  if (!req.session?.perfil?.administrador) return next(new HttpError(403, 'SEM_PERMISSAO', 'Acesso restrito à administração.'))
  next()
}
