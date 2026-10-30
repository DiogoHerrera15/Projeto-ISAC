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

// Relatório de vendas: só pedidos confirmados, pela data local da confirmação.
const confirmedSales = `select p.*, (p.confirmado_em at time zone $1)::date as dia
  from pedidos p where p.status = 'confirmado'
  and ($2::date is null or (p.confirmado_em at time zone $1)::date >= $2)
  and ($3::date is null or (p.confirmado_em at time zone $1)::date <= $3)`

const money = (expression) => `coalesce(sum(${expression}), 0)::numeric(14,2)`

export async function salesBounds(db, timeZone) {
  const { rows } = await db.query(
    `select to_char(min(dia), 'YYYY-MM-DD') as de, to_char(max(dia), 'YYYY-MM-DD') as ate
     from (${confirmedSales}) v`, [timeZone, null, null],
  )
  return rows[0]
}

export async function salesTotals(db, { timeZone, from, to }) {
  const { rows } = await db.query(
    `select count(*)::int as pedidos, ${money('valor_total')} as valor_total,
     ${money('comissao_isac')} as comissao_isac, ${money('valor_vendedores')} as valor_vendedores
     from (${confirmedSales}) v`, [timeZone, from, to],
  )
  return rows[0]
}

// unit vem de uma lista fixa (day, week, month); a série inclui períodos sem venda.
export async function salesByPeriod(db, { timeZone, from, to, unit }) {
  const { rows } = await db.query(
    `select to_char(g.inicio, 'YYYY-MM-DD') as inicio, count(v.id)::int as pedidos,
     ${money('v.valor_total')} as valor_total, ${money('v.comissao_isac')} as comissao_isac,
     ${money('v.valor_vendedores')} as valor_vendedores
     from generate_series(date_trunc('${unit}', $2::date::timestamp), date_trunc('${unit}', $3::date::timestamp),
       interval '1 ${unit}') g(inicio)
     left join (${confirmedSales}) v on date_trunc('${unit}', v.dia::timestamp) = g.inicio
     group by g.inicio order by g.inicio`, [timeZone, from, to],
  )
  return rows
}

export async function salesByStore(db, { timeZone, from, to }) {
  const { rows } = await db.query(
    `select l.id as loja_id, l.nome, count(distinct v.id)::int as pedidos,
     ${money('i.subtotal')} as valor_total, ${money('i.valor_comissao')} as comissao_isac,
     ${money('i.valor_vendedor')} as valor_vendedores
     from (${confirmedSales}) v join pedido_itens i on i.pedido_id = v.id join lojas l on l.id = i.loja_id
     group by l.id order by sum(i.valor_comissao) desc, l.nome, l.id`, [timeZone, from, to],
  )
  return rows
}
