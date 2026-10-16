import { readConfig } from '../src/config/env.js'
import { createPool } from '../src/db/pool.js'

const email = process.argv[2]?.trim().toLowerCase()
if (!email || !email.includes('@')) {
  console.error('Uso: npm run admin:promote -- email@exemplo.com')
  process.exitCode = 2
} else {
  const config = readConfig()
  const pool = createPool(config.migrationDatabaseUrl)
  try {
    const { rowCount } = await pool.query(
      'update perfis set administrador = true where id = (select id from usuarios where email = $1)',
      [email],
    )
    if (rowCount !== 1) throw new Error('Conta não encontrada.')
    console.log('Administrador definido para a conta informada.')
  } finally {
    await pool.end()
  }
}
