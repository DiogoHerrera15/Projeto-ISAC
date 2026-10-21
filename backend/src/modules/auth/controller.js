import { z } from 'zod'
import { validate, normalizePhone } from '../../http/validation.js'
import { clearSessionCookie, loadSession, readSessionToken, setSessionCookie } from './sessions.js'
import * as service from './service.js'

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

export function createAuthController(pool, config) {
  return {
    async register(req, res) {
      const fields = validate(signupSchema, req.body)
      const result = await service.register(pool, { ...fields, telefone: normalizePhone(fields.telefone) }, config.sessionTtlSeconds)
      setSessionCookie(res, result.token, config)
      res.status(201).json({ data: { usuario: result.usuario, perfil: result.perfil, precisaConfirmarEmail: false } })
    },
    async login(req, res) {
      const fields = validate(loginSchema, req.body)
      const result = await service.login(pool, fields, config.sessionTtlSeconds)
      setSessionCookie(res, result.token, config)
      res.json({ data: { usuario: result.usuario, perfil: result.perfil } })
    },
    async getSession(req, res) {
      const session = await loadSession(req, pool)
      res.json({ data: session ? { usuario: session.usuario, perfil: session.perfil } : null })
    },
    async logout(req, res) {
      const token = readSessionToken(req)
      if (token) await service.logout(pool, token)
      clearSessionCookie(res, config)
      res.status(204).end()
    },
  }
}
