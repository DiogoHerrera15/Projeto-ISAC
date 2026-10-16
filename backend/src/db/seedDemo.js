import { hashPassword } from '../modules/auth/passwords.js'
import { withTransaction } from './transaction.js'

const people = [
  ['10000000-0000-4000-8000-000000000001', 'cliente@exemplo.com', 'Ana Souza', false],
  ['10000000-0000-4000-8000-000000000002', 'lucia@exemplo.com', 'Lúcia Ferreira', false],
  ['10000000-0000-4000-8000-000000000003', 'marcos@exemplo.com', 'Marcos Lima', false],
  ['10000000-0000-4000-8000-000000000004', 'admin@isac.org', 'Equipe ISAC', true],
]
const stores = [
  ['20000000-0000-4000-8000-000000000001', people[1][0], 'Doces da Lúcia', 'Doces caseiros da comunidade.'],
  ['20000000-0000-4000-8000-000000000002', people[2][0], 'Horta do Gaibu', 'Verduras e temperos da horta comunitária.'],
]
const products = [
  ['30000000-0000-4000-8000-000000000001', stores[0][0], 'Bolo de rolo', '35.00', 8],
  ['30000000-0000-4000-8000-000000000002', stores[0][0], 'Cocada de forno', '18.00', 15],
  ['30000000-0000-4000-8000-000000000003', stores[1][0], 'Cesta de verduras', '30.00', 12],
  ['30000000-0000-4000-8000-000000000004', stores[1][0], 'Kit de mudas', '15.00', 20],
]

export async function seedDemo(pool) {
  const passwordHash = await hashPassword('isac1234')
  await withTransaction(pool, async (db) => {
    for (const [id, email, name, admin] of people) {
      await db.query('insert into usuarios(id, email, senha_hash) values ($1, $2, $3) on conflict (id) do nothing',
        [id, email, passwordHash])
      await db.query(`insert into perfis(id, nome, telefone, administrador)
        values ($1, $2, '81999999999', $3) on conflict (id) do nothing`, [id, name, admin])
    }
    for (const [id, sellerId, name, description] of stores) {
      await db.query(`insert into lojas(id, vendedor_id, nome, descricao)
        values ($1, $2, $3, $4) on conflict (id) do nothing`, [id, sellerId, name, description])
    }
    for (const [id, storeId, name, price, stock] of products) {
      await db.query(`insert into produtos(id, loja_id, nome, preco, estoque)
        values ($1, $2, $3, $4, $5) on conflict (id) do nothing`, [id, storeId, name, price, stock])
    }
  })
}
