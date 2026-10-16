import { z } from 'zod'
import { validate } from '../../http/validation.js'
import { HttpError } from '../../http/errors.js'
import { requireSession } from '../auth/sessions.js'

const createSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  descricao: z.string().max(2000).nullable().optional(),
}).strict()
const updateSchema = createSchema.partial().extend({ ativa: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0)

export async function ownStore(pool, userId) {
  const { rows } = await pool.query('select * from lojas where vendedor_id = $1', [userId])
  return rows[0] || null
}

export function registerStoreRoutes(app, pool) {
  const auth = requireSession(pool)
  app.get('/api/v1/minha-loja', auth, async (req, res) => {
    res.json({ data: await ownStore(pool, req.session.usuario.id) })
  })
  app.post('/api/v1/minha-loja', auth, async (req, res) => {
    const fields = validate(createSchema, req.body)
    try {
      const { rows } = await pool.query(
        'insert into lojas(vendedor_id, nome, descricao) values ($1, $2, $3) returning *',
        [req.session.usuario.id, fields.nome, fields.descricao ?? null],
      )
      res.status(201).json({ data: rows[0] })
    } catch (error) {
      if (error.code === '23505') throw new HttpError(409, 'LOJA_JA_EXISTE', 'Você já possui uma loja.')
      throw error
    }
  })
  app.patch('/api/v1/minha-loja', auth, async (req, res) => {
    const fields = validate(updateSchema, req.body)
    const existing = await ownStore(pool, req.session.usuario.id)
    if (!existing) throw new HttpError(404, 'NAO_ENCONTRADO', 'Loja não encontrada.')
    const result = await pool.query(
      'update lojas set nome = $1, descricao = $2, ativa = $3 where id = $4 and vendedor_id = $5 returning *',
      [fields.nome ?? existing.nome, fields.descricao === undefined ? existing.descricao : fields.descricao,
        fields.ativa ?? existing.ativa, existing.id, req.session.usuario.id],
    )
    res.json({ data: result.rows[0] })
  })
}
