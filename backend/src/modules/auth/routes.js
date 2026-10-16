import { z } from 'zod'
import { validate, normalizePhone } from '../../http/validation.js'
import { authRateLimit } from '../../http/rateLimit.js'
import { register, login } from './service.js'
import { clearSessionCookie, loadSession, readSessionToken, setSessionCookie, tokenHash } from './sessions.js'

const signupSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  senha: z.string().min(8).max(128),
  telefone: z.string().optional().nullable(),
}).strict()
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  senha: z.string(),
}).strict()

export function registerAuthRoutes(app, pool, config) {
  const limit = authRateLimit()
  app.post('/api/v1/auth/cadastro', limit, async (req, res) => {
    const fields = validate(signupSchema, req.body)
    const result = await register(pool, { ...fields, telefone: normalizePhone(fields.telefone) }, config.sessionTtlSeconds)
    setSessionCookie(res, result.token, config)
    res.status(201).json({ data: { usuario: result.usuario, perfil: result.perfil, precisaConfirmarEmail: false } })
  })
  app.post('/api/v1/auth/login', limit, async (req, res) => {
    const fields = validate(loginSchema, req.body)
    const result = await login(pool, fields, config.sessionTtlSeconds)
    setSessionCookie(res, result.token, config)
    res.json({ data: { usuario: result.usuario, perfil: result.perfil } })
  })
  app.get('/api/v1/auth/sessao', async (req, res) => {
    const session = await loadSession(req, pool)
    res.json({ data: session ? { usuario: session.usuario, perfil: session.perfil } : null })
  })
  app.post('/api/v1/auth/logout', async (req, res) => {
    const token = readSessionToken(req)
    if (token) await pool.query('delete from sessoes where token_hash = $1', [tokenHash(token)])
    clearSessionCookie(res, config)
    res.status(204).end()
  })
}
