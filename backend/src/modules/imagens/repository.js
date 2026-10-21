export async function createImage(db, storeId, key, mime, size) {
  const result = await db.query(
    'insert into imagens(loja_id, chave_arquivo, mime, tamanho) values ($1, $2, $3, $4) returning id',
    [storeId, key, mime, size],
  )
  return result.rows[0].id
}

export async function findImage(db, id) {
  const { rows } = await db.query('select chave_arquivo, mime from imagens where id = $1', [id])
  return rows[0] || null
}

export async function deleteOrphanImages(db) {
  const { rows } = await db.query(
    `delete from imagens i where i.criado_em < now() - interval '24 hours'
     and not exists (select 1 from produtos p where p.imagem_id = i.id)
     returning i.chave_arquivo`,
  )
  return rows.map((row) => row.chave_arquivo)
}
