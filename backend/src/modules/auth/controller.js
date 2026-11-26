import { z } from 'zod'
import { validate, normalizePhone } from '../../http/validation.js'
import { clearSessionCookie, loadSession, readSessionToken, setSessionCookie } from './sessions.js'
import * as service from './service.js'

const newPassword = z.string().min(8).max(128)
const signupSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  senha: newPassword,
  telefone: z.string().optional().nullable(),
}).strict()
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  senha: z.string(),
}).strict()
const changePasswordSchema = z.object({
  senhaAtual: z.string().min(1).max(128),
  novaSenha: newPassword,
}).strict()
const requestResetSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
}).strict()
const resetPasswordSchema = z.object({
  token: z.string().max(100),
  novaSenha: newPassword,
}).strict()

export function createAuthController(pool, config, mailer) {
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
    async changePassword(req, res) {
      const fields = validate(changePasswordSchema, req.body)
      await service.changePassword(pool, { userId: req.session.usuario.id, currentToken: readSessionToken(req) }, fields)
      res.status(204).end()
    },
    async requestPasswordReset(req, res) {
      const fields = validate(requestResetSchema, req.body)
      await service.requestPasswordReset(pool, mailer, config, fields)
      // Resposta idêntica para qualquer e-mail válido (a conta existindo ou não).
      res.json({ data: { enviado: true } })
    },
    async resetPassword(req, res) {
      const fields = validate(resetPasswordSchema, req.body)
      await service.resetPassword(pool, fields)
      res.status(204).end()
    },
  }
}
