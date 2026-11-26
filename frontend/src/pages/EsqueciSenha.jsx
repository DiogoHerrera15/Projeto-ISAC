import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { mensagemDeErro } from '../lib/format'
import { Aviso, Botao, Campo } from '../components/ui'

export default function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(null) // { email, linkDemonstracao? }

  async function aoEnviar(e) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      const resposta = await api.solicitarRecuperacao(email.trim())
      setEnviado({ email: email.trim(), ...resposta })
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setEnviando(false)
    }
  }

  if (enviado)
    return (
      <div className="mx-auto max-w-md px-4 py-14">
        <h1 className="text-6xl font-extrabold">Confira seu e-mail</h1>
        <p className="mt-4 text-lg">
          Se existir uma conta com <strong>{enviado.email}</strong>, enviamos um link para criar uma nova senha. O link vale por
          pouco tempo e só pode ser usado uma vez.
        </p>
        <p className="mt-2 text-tinta-suave">Não chegou? Veja a caixa de spam ou peça de novo daqui a alguns minutos.</p>
        {enviado.linkDemonstracao && (
          <Aviso tipo="atencao" className="mt-6">
            <strong>Modo demonstração:</strong> não há envio de e-mail. Use{' '}
            <Link to={enviado.linkDemonstracao} className="font-bold underline">
              este link para redefinir a senha
            </Link>
            .
          </Aviso>
        )}
        {import.meta.env.DEV && !enviado.linkDemonstracao && (
          <Aviso tipo="info" className="mt-6">
            Em desenvolvimento, sem servidor de e-mail configurado, o link aparece no terminal onde o backend está rodando.
          </Aviso>
        )}
        <Link to="/entrar" className="mt-6 inline-block font-bold text-mar underline underline-offset-4">
          Voltar para Entrar
        </Link>
      </div>
    )

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-6xl font-extrabold">Esqueci minha senha</h1>
      <p className="mt-2 text-tinta-suave">Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.</p>
      <form onSubmit={aoEnviar} className="mt-8 space-y-5">
        <Campo rotulo="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Botao type="submit" tamanho="g" className="w-full" carregando={enviando}>
          Enviar link
        </Botao>
      </form>
      <Link to="/entrar" className="mt-6 inline-block font-bold text-mar underline underline-offset-4">
        Voltar para Entrar
      </Link>
    </div>
  )
}
