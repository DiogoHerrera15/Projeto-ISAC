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

export async function findUserById(db, userId) {
  const { rows } = await db.query('select id, email, senha_hash from usuarios where id = $1', [userId])
  return rows[0] || null
}

export async function updatePasswordHash(db, userId, hash) {
  await db.query('update usuarios set senha_hash = $1 where id = $2', [hash, userId])
}

// Encerra as sessões da conta, menos a informada (quem trocou a senha continua logado).
export async function deleteOtherSessions(db, userId, keepHash) {
  await db.query('delete from sessoes where usuario_id = $1 and token_hash <> $2', [userId, keepHash])
}

export async function deleteUserSessions(db, userId) {
  await db.query('delete from sessoes where usuario_id = $1', [userId])
}

// ---------- Redefinição de senha ----------
export async function recentResetExists(db, userId, seconds) {
  const { rows } = await db.query(
    `select 1 from redefinicoes_senha
     where usuario_id = $1 and criado_em > now() - $2 * interval '1 second'`,
    [userId, seconds],
  )
  return rows.length > 0
}

export async function createReset(db, userId, hash, ttlSeconds) {
  await db.query(
    "insert into redefinicoes_senha(usuario_id, token_hash, expira_em) values ($1, $2, now() + $3 * interval '1 second')",
    [userId, hash, ttlSeconds],
  )
}

// Inutiliza os links ainda abertos da conta (um novo pedido, ou uma senha nova, invalida os anteriores).
export async function invalidateResets(db, userId) {
  await db.query('update redefinicoes_senha set usado_em = now() where usuario_id = $1 and usado_em is null', [userId])
}

export async function findValidReset(db, hash) {
  const { rows } = await db.query(
    'select 1 from redefinicoes_senha where token_hash = $1 and usado_em is null and expira_em > now()', [hash],
  )
  return rows.length > 0
}

// Consome o token numa única instrução: só um pedido simultâneo consegue usá-lo.
export async function claimReset(db, hash) {
  const { rows } = await db.query(
    `update redefinicoes_senha set usado_em = now()
     where token_hash = $1 and usado_em is null and expira_em > now() returning usuario_id`,
    [hash],
  )
  return rows[0]?.usuario_id || null
}

export async function deleteExpiredResets(db) {
  const { rowCount } = await db.query("delete from redefinicoes_senha where expira_em < now() - interval '1 day'")
  return rowCount
}

export async function deleteExpiredSessions(db) {
  const { rowCount } = await db.query('delete from sessoes where expira_em <= now()')
  return rowCount
}
