import pg from 'pg'

export function createPool(connectionString, options = {}) {
  const pool = new pg.Pool({ connectionString, ...options })
  // Uma conexão ociosa que cai (reinício do banco, rede) emite 'error' no pool.
  // Sem ouvinte, o Node encerraria o processo inteiro; aqui só registramos.
  pool.on('error', (error) => console.error('Erro em conexão ociosa do PostgreSQL:', error.message))
  return pool
}
