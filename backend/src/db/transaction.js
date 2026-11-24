export async function withTransaction(pool, fn) {
  const client = await pool.connect()
  let broken = false
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    // Se o ROLLBACK também falhar, o erro original não pode ser perdido e a
    // conexão (em estado incerto) é descartada em vez de voltar ao pool.
    try {
      await client.query('ROLLBACK')
    } catch {
      broken = true
    }
    throw error
  } finally {
    client.release(broken || undefined)
  }
}
