import { z } from 'zod'
import { validate, normalizePhone } from '../../http/validation.js'
import { requireSession } from '../auth/sessions.js'

const updateSchema = z.object({
  nome: z.string().trim().min(1).max(120).optional(),
  telefone: z.string().nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0)

export function registerProfileRoutes(app, pool) {
  app.get('/api/v1/perfil', requireSession(pool), (req, res) => res.json({ data: req.session.perfil }))
  app.patch('/api/v1/perfil', requireSession(pool), async (req, res) => {
    const fields = validate(updateSchema, req.body)
    const nome = fields.nome ?? req.session.perfil.nome
    const telefone = fields.telefone === undefined ? req.session.perfil.telefone : normalizePhone(fields.telefone)
    const { rows } = await pool.query(
      'update perfis set nome = $1, telefone = $2 where id = $3 returning id, nome, telefone, administrador',
      [nome, telefone, req.session.usuario.id],
    )
    res.json({ data: rows[0] })
  })
}
