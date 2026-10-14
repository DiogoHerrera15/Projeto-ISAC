import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { mensagemDeErro } from '../lib/format'
import { Aviso, Botao, Campo } from '../components/ui'

export default function Cadastrar() {
  const { cadastrar, usuario } = useAuth()
  const navegar = useNavigate()
  const local = useLocation()
  const destino = local.state?.voltarPara || '/'
  const [dados, setDados] = useState({ nome: '', email: '', telefone: '', senha: '' })
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [confirmarEmail, setConfirmarEmail] = useState(false)

  useEffect(() => {
    if (usuario) navegar(destino, { replace: true })
  }, [usuario, destino, navegar])

  const mudar = (campo) => (e) => setDados((d) => ({ ...d, [campo]: e.target.value }))

  async function aoEnviar(e) {
    e.preventDefault()
    setErro('')
    if (dados.senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    setEnviando(true)
    try {
      const r = await cadastrar({ ...dados, nome: dados.nome.trim(), email: dados.email.trim() })
      if (r?.precisaConfirmarEmail) setConfirmarEmail(true)
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setEnviando(false)
    }
  }

  if (confirmarEmail)
    return (
      <div className="mx-auto max-w-md px-4 py-14">
        <h1 className="text-6xl font-extrabold">Confira seu e-mail</h1>
        <p className="mt-4 text-lg">
          Enviamos um link de confirmação para <strong>{dados.email}</strong>. Abra o link e depois entre com sua senha.
        </p>
        <Link to="/entrar" className="mt-6 inline-block font-bold text-mar underline underline-offset-4">
          Ir para Entrar
        </Link>
      </div>
    )

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-6xl font-extrabold">Criar conta</h1>
      <p className="mt-2 text-tinta-suave">
        A mesma conta serve para comprar e para abrir sua loja. Já tem conta?{' '}
        <Link to="/entrar" state={local.state} className="font-bold text-mar underline underline-offset-4">
          Entrar
        </Link>
      </p>
      <form onSubmit={aoEnviar} className="mt-8 space-y-5">
        <Campo rotulo="Nome" autoComplete="name" required value={dados.nome} onChange={mudar('nome')} />
        <Campo rotulo="E-mail" type="email" autoComplete="email" required value={dados.email} onChange={mudar('email')} />
        <Campo
          rotulo="Telefone (WhatsApp)"
          dica="Opcional agora, mas necessário para fazer pedidos."
          type="tel"
          autoComplete="tel"
          placeholder="(81) 99999-9999"
          value={dados.telefone}
          onChange={mudar('telefone')}
        />
        <Campo
          rotulo="Senha"
          dica="Pelo menos 6 caracteres."
          type="password"
          autoComplete="new-password"
          required
          value={dados.senha}
          onChange={mudar('senha')}
        />
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Botao type="submit" tamanho="g" className="w-full" carregando={enviando}>
          Criar conta
        </Botao>
      </form>
    </div>
  )
}
