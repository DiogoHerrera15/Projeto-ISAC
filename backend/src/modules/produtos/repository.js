import { productFields } from '../catalogo/repository.js'

export async function imageBelongsToStore(db, imageId, storeId) {
  const { rows } = await db.query('select id from imagens where id = $1 and loja_id = $2', [imageId, storeId])
  return rows.length > 0
}

export async function listOwnProducts(db, storeId, { limit, offset }) {
  const count = await db.query('select count(*)::int as total from produtos where loja_id = $1', [storeId])
  const result = await db.query(
    `select ${productFields} from produtos p join lojas l on l.id = p.loja_id
     where p.loja_id = $1 order by p.criado_em desc, p.id desc limit $2 offset $3`,
    [storeId, limit, offset],
  )
  return { rows: result.rows, total: count.rows[0].total }
}

export async function createProduct(db, storeId, fields, url) {
  const result = await db.query(
    `insert into produtos(loja_id, nome, descricao, preco, estoque, ativo, imagem_id, foto_url, categoria_id)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
    [storeId, fields.nome, fields.descricao ?? null, fields.preco, fields.estoque,
      fields.ativo, fields.imagem_id ?? null, url, fields.categoria_id ?? null],
  )
  return result.rows[0].id
}

export async function updateProduct(db, existing, fields, imageId, url) {
  const { rows } = await db.query(
    `update produtos set nome = $1, descricao = $2, preco = $3, estoque = $4, ativo = $5,
     imagem_id = $6, foto_url = $7, categoria_id = $10, versao = versao + 1
     where id = $8 and versao = $9 returning id`,
    [fields.nome ?? existing.nome, fields.descricao === undefined ? existing.descricao : fields.descricao,
      fields.preco ?? existing.preco, fields.estoque ?? existing.estoque, fields.ativo ?? existing.ativo,
      imageId, url, existing.id, fields.versao,
      fields.categoria_id === undefined ? existing.categoria_id : fields.categoria_id],
  )
  return rows[0] || null
}
