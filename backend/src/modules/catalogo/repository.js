export const productFields = `p.id, p.loja_id, p.imagem_id, p.nome, p.descricao, p.preco,
  p.foto_url, p.estoque, p.ativo, p.versao, p.criado_em,
  json_build_object('id', l.id, 'nome', l.nome, 'descricao', l.descricao, 'ativa', l.ativa) as loja`

function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&')
}

export async function fetchProduct(db, id) {
  const result = await db.query(
    `select ${productFields}, l.vendedor_id from produtos p join lojas l on l.id = p.loja_id where p.id = $1`, [id],
  )
  return result.rows[0] || null
}

export async function listProducts(db, { busca, lojaId, limit, offset }) {
  const params = [busca.trim() ? `%${escapeLike(busca.trim())}%` : null, lojaId || null]
  const where = `p.ativo = true and l.ativa = true and ($1::text is null or p.nome ilike $1 escape '\\')
    and ($2::uuid is null or p.loja_id = $2)`
  const total = await db.query(`select count(*)::int as total from produtos p join lojas l on l.id = p.loja_id where ${where}`, params)
  const rows = await db.query(
    `select ${productFields} from produtos p join lojas l on l.id = p.loja_id
     where ${where} order by p.criado_em desc, p.id desc limit $3 offset $4`, [...params, limit, offset],
  )
  return { rows: rows.rows, total: total.rows[0].total }
}

export async function listStores(db, { limit, offset }) {
  const count = await db.query('select count(*)::int as total from lojas where ativa = true')
  const result = await db.query(
    'select id, nome, descricao from lojas where ativa = true order by nome, id limit $1 offset $2', [limit, offset],
  )
  return { rows: result.rows, total: count.rows[0].total }
}

export async function getCommission(db) {
  const result = await db.query('select percentual_comissao from configuracoes where id = 1')
  return result.rows[0]
}
