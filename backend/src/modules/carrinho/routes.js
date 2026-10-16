import { z } from 'zod'
import { validate } from '../../http/validation.js'
import { HttpError } from '../../http/errors.js'
import { requireSession } from '../auth/sessions.js'
import { setQuantity, removeItem } from './service.js'

const quantitySchema = z.object({ quantidade: z.number().int().min(1).max(999) }).strict()

export function registerCartRoutes(app, pool) {
  const auth = requireSession(pool)
  app.get('/api/v1/carrinho', auth, async (req, res) => {
    const { rows } = await pool.query(
      `select c.produto_id, c.quantidade,
        to_jsonb(p) || jsonb_build_object(
          'preco', p.preco::text,
          'loja', jsonb_build_object('id', l.id, 'nome', l.nome, 'descricao', l.descricao, 'ativa', l.ativa)
        ) as produto
       from carrinho_itens c join produtos p on p.id = c.produto_id
       join lojas l on l.id = p.loja_id
       where c.cliente_id = $1 order by c.adicionado_em, c.produto_id`,
      [req.session.usuario.id],
    )
    res.json({ data: rows })
  })
  app.put('/api/v1/carrinho/itens/:produtoId', auth, async (req, res) => {
    if (!z.uuid().safeParse(req.params.produtoId).success) throw new HttpError(400, 'ENTRADA_INVALIDA', 'Produto inválido.')
    const { quantidade } = validate(quantitySchema, req.body)
    const item = await setQuantity(pool, req.session.usuario.id, req.params.produtoId, quantidade)
    res.json({ data: item })
  })
  app.delete('/api/v1/carrinho/itens/:produtoId', auth, async (req, res) => {
    if (!z.uuid().safeParse(req.params.produtoId).success) throw new HttpError(400, 'ENTRADA_INVALIDA', 'Produto inválido.')
    await removeItem(pool, req.session.usuario.id, req.params.produtoId)
    res.status(204).end()
  })
}
