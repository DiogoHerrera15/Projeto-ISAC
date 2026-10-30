export const productFields = `p.id, p.loja_id, p.imagem_id, p.categoria_id, p.nome, p.descricao, p.preco,
  p.foto_url, p.estoque, p.ativo, p.versao, p.criado_em,
  json_build_object('id', l.id, 'nome', l.nome, 'descricao', l.descricao, 'ativa', l.ativa) as loja,
  (select json_build_object('id', c.id, 'nome', c.nome) from categorias c where c.id = p.categoria_id) as categoria`

// O id no fim de cada ordem deixa a paginação estável quando há empates.
export const productOrders = {
  recentes: 'p.criado_em desc, p.id desc',
  menor: 'p.preco asc, p.id asc',
  maior: 'p.preco desc, p.id desc',
  nome: 'p.nome asc, p.id asc',
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&')
}

export async function fetchProduct(db, id) {
  const result = await db.query(
    `select ${productFields}, l.vendedor_id from produtos p join lojas l on l.id = p.loja_id where p.id = $1`, [id],
  )
  return result.rows[0] || null
}

export async function listProducts(db, { busca, lojaId, categoria, ordem, limit, offset }) {
  const params = [busca.trim() ? `%${escapeLike(busca.trim())}%` : null, lojaId || null, categoria || null]
  const where = `p.ativo = true and l.ativa = true and ($1::text is null or p.nome ilike $1 escape '\\')
    and ($2::uuid is null or p.loja_id = $2) and ($3::text is null or p.categoria_id = $3)`
  const total = await db.query(`select count(*)::int as total from produtos p join lojas l on l.id = p.loja_id where ${where}`, params)
  const rows = await db.query(
    `select ${productFields} from produtos p join lojas l on l.id = p.loja_id
     where ${where} order by ${productOrders[ordem] ?? productOrders.recentes} limit $4 offset $5`, [...params, limit, offset],
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

export async function fetchStore(db, id) {
  const { rows } = await db.query(
    `select l.id, l.nome, l.descricao, l.ativa, l.criado_em, l.vendedor_id,
     (select count(*)::int from produtos p where p.loja_id = l.id and p.ativo = true) as total_produtos
     from lojas l where l.id = $1`, [id],
  )
  return rows[0] || null
}

export async function listCategories(db) {
  const { rows } = await db.query('select id, nome from categorias order by ordem, nome')
  return rows
}

export async function categoryExists(db, id) {
  const { rows } = await db.query('select id from categorias where id = $1', [id])
  return rows.length > 0
}

export async function getCommission(db) {
  const result = await db.query('select percentual_comissao from configuracoes where id = 1')
  return result.rows[0]
}
