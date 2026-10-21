export async function createUser(db, email, passwordHash) {
  const { rows } = await db.query('insert into usuarios(email, senha_hash) values ($1, $2) returning id, email', [email, passwordHash])
  return rows[0]
}

export async function createProfile(db, userId, name, phone) {
  const { rows } = await db.query(
    'insert into perfis(id, nome, telefone) values ($1, $2, $3) returning id, nome, telefone, administrador',
    [userId, name, phone],
  )
  return rows[0]
}

export async function findUserByEmail(db, email) {
  const { rows } = await db.query('select id, email, senha_hash from usuarios where email = $1', [email])
  return rows[0] || null
}

export async function findProfile(db, userId) {
  const { rows } = await db.query('select id, nome, telefone, administrador from perfis where id = $1', [userId])
  return rows[0] || null
}

export async function createSessionRecord(db, userId, hash, ttlSeconds) {
  await db.query(
    "insert into sessoes(usuario_id, token_hash, expira_em) values ($1, $2, now() + $3 * interval '1 second')",
    [userId, hash, ttlSeconds],
  )
}

export async function findSession(db, hash) {
  const { rows } = await db.query(
    `select s.id as sessao_id, u.id as usuario_id, u.email, p.nome, p.telefone, p.administrador
     from sessoes s join usuarios u on u.id = s.usuario_id join perfis p on p.id = u.id
     where s.token_hash = $1 and s.expira_em > now()`,
    [hash],
  )
  return rows[0] || null
}

export async function deleteSession(db, hash) {
  await db.query('delete from sessoes where token_hash = $1', [hash])
}
