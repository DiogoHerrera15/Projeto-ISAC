import { z } from 'zod'
import { validate, normalizePhone } from '../../http/validation.js'
import * as service from './service.js'

const updateSchema = z.object({
  nome: z.string().trim().min(1).max(120).optional(),
  telefone: z.string().nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0)

export function createProfileController(pool) {
  return {
    getProfile(req, res) {
      res.json({ data: req.session.perfil })
    },
    async updateProfile(req, res) {
      const fields = validate(updateSchema, req.body)
      const telefone = fields.telefone === undefined ? undefined : normalizePhone(fields.telefone)
      const profile = await service.updateProfile(pool, req.session, { ...fields, telefone })
      res.json({ data: profile })
    },
  }
}
