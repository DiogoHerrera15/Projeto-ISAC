import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { mensagemDeErro } from '../lib/format'
import { Aviso, Botao, Campo, TituloPagina } from '../components/ui'

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
    </div>
  )
}
