import { productFields } from '../catalogo/repository.js'

export async function listStores(db, { limit, offset }) {
  const count = await db.query('select count(*)::int as total from lojas')
  const result = await db.query(
    `select l.*, json_build_object('nome', pf.nome, 'telefone', pf.telefone) as vendedor,
     count(p.id)::int as total_produtos
     from lojas l join perfis pf on pf.id = l.vendedor_id
     left join produtos p on p.loja_id = l.id
     group by l.id, pf.id order by l.nome, l.id limit $1 offset $2`, [limit, offset],
  )
  return { rows: result.rows, total: count.rows[0].total }
}

export async function updateStore(db, id, active) {
  const { rows } = await db.query('update lojas set ativa = $1 where id = $2 returning *', [active, id])
  return rows[0] || null
}

export async function listProducts(db, { limit, offset }) {
  const count = await db.query('select count(*)::int as total from produtos')
  const result = await db.query(
    `select ${productFields} from produtos p join lojas l on l.id = p.loja_id
     order by p.nome, p.id limit $1 offset $2`, [limit, offset],
  )
  return { rows: result.rows, total: count.rows[0].total }
}

export async function updateProduct(db, id, active, version) {
  const { rows } = await db.query(
    'update produtos set ativo = $1, versao = versao + 1 where id = $2 and versao = $3 returning id',
    [active, id, version],
  )
  if (!rows.length) return null
  const updated = await db.query(
    `select ${productFields} from produtos p join lojas l on l.id = p.loja_id where p.id = $1`, [id],
  )
  return updated.rows[0]
}

export async function productExists(db, id) {
  const result = await db.query('select id from produtos where id = $1', [id])
  return result.rows.length > 0
}

export async function updateCommission(db, rate) {
  const { rows } = await db.query(
    'update configuracoes set percentual_comissao = $1 where id = 1 returning percentual_comissao', [rate],
  )
  return rows[0]
}
