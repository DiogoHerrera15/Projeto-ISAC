import * as repository from './repository.js'

export async function updateProfile(db, session, fields) {
  return repository.updateProfile(db, session.usuario.id, {
    nome: fields.nome ?? session.perfil.nome,
    telefone: fields.telefone === undefined ? session.perfil.telefone : fields.telefone,
  })
}
