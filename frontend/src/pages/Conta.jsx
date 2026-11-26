import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { mensagemDeErro } from '../lib/format'
import { Aviso, Botao, Campo, TituloPagina } from '../components/ui'

function AlterarSenha() {
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [msg, setMsg] = useState(null)
  const [salvando, setSalvando] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    setMsg(null)
    if (nova.length < 8) {
      setMsg({ tipo: 'erro', texto: 'A nova senha precisa ter pelo menos 8 caracteres.' })
      return
    }
    if (nova !== confirmacao) {
      setMsg({ tipo: 'erro', texto: 'As senhas novas não são iguais.' })
      return
    }
    setSalvando(true)
    try {
      await api.alterarSenha({ senhaAtual: atual, novaSenha: nova })
      setAtual('')
      setNova('')
      setConfirmacao('')
      setMsg({ tipo: 'ok', texto: 'Senha alterada. Os outros aparelhos conectados à sua conta foram desconectados.' })
    } catch (e) {
      setMsg({ tipo: 'erro', texto: mensagemDeErro(e) })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={salvar} className="mt-14 space-y-5 border-t-2 border-linha pt-10">
      <h2 className="text-4xl font-extrabold">Alterar senha</h2>
      <Campo
        rotulo="Senha atual"
        type="password"
        autoComplete="current-password"
        required
        value={atual}
        onChange={(e) => setAtual(e.target.value)}
      />
      <Campo
        rotulo="Nova senha"
        dica="Pelo menos 8 caracteres."
        type="password"
        autoComplete="new-password"
        required
        value={nova}
        onChange={(e) => setNova(e.target.value)}
      />
      <Campo
        rotulo="Repita a nova senha"
        type="password"
        autoComplete="new-password"
        required
        value={confirmacao}
        onChange={(e) => setConfirmacao(e.target.value)}
      />
      {msg && <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>}
      <Botao type="submit" carregando={salvando}>
        Alterar senha
      </Botao>
    </form>
  )
}

export default function Conta() {
  const { usuario, perfil, recarregarPerfil } = useAuth()
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [msg, setMsg] = useState(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    setNome(perfil?.nome || '')
    setTelefone(perfil?.telefone || '')
  }, [perfil])

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    setMsg(null)
    try {
      await api.atualizarPerfil(usuario.id, { nome: nome.trim(), telefone: telefone.trim() })
      await recarregarPerfil()
      setMsg({ tipo: 'ok', texto: 'Dados salvos.' })
    } catch (e) {
      setMsg({ tipo: 'erro', texto: mensagemDeErro(e) })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <TituloPagina titulo="Minha conta">
        Seu nome e telefone aparecem para as lojas quando você faz um pedido.
      </TituloPagina>
      <form onSubmit={salvar} className="space-y-5">
        <Campo rotulo="E-mail" value={usuario?.email || ''} disabled dica="O e-mail de acesso não pode ser alterado aqui." />
        <Campo rotulo="Nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
        <Campo rotulo="Telefone (WhatsApp)" type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        {msg && <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>}
        <Botao type="submit" carregando={salvando}>
          Salvar dados
        </Botao>
      </form>
      <AlterarSenha />
    </div>
  )
}
