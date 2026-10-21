export async function updateProfile(db, userId, { nome, telefone }) {
  const { rows } = await db.query(
    'update perfis set nome = $1, telefone = $2 where id = $3 returning id, nome, telefone, administrador',
    [nome, telefone, userId],
  )
  return rows[0]
}
