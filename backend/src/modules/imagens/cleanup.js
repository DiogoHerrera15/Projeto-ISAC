import { removeImage } from '../../storage/local.js'

export async function cleanOrphanImages(pool, directory) {
  const { rows } = await pool.query(
    `delete from imagens i where i.criado_em < now() - interval '24 hours'
     and not exists (select 1 from produtos p where p.imagem_id = i.id)
     returning i.chave_arquivo`,
  )
  for (const row of rows) await removeImage(directory, row.chave_arquivo)
  return rows.length
}
