import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { modoDemo } from '../services/api'
import { CONTAS_DEMO, SENHA_DEMO } from '../services/demoSeed'
import { mensagemDeErro } from '../lib/format'
import { Aviso, Botao, Campo } from '../components/ui'

export default function Entrar() {
  const { entrar, usuario } = useAuth()
  const navegar = useNavigate()
  const local = useLocation()
  const destino = local.state?.voltarPara || '/'
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (usuario) navegar(destino, { replace: true })
  }, [usuario, destino, navegar])

  async function aoEnviar(e) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      await entrar({ email, senha })
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-6xl font-extrabold">Entrar</h1>
      <p className="mt-2 text-tinta-suave">
        Ainda não tem conta?{' '}
        <Link to="/cadastrar" state={local.state} className="font-bold text-mar underline underline-offset-4">
          Criar conta
        </Link>
      </p>

      <form onSubmit={aoEnviar} className="mt-8 space-y-5">
        <Campo rotulo="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Campo
          rotulo="Senha"
          type="password"
          autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Botao type="submit" tamanho="g" className="w-full" carregando={enviando}>
          Entrar
        </Botao>
      </form>

      {modoDemo && (
        <div className="mt-10 border-t-2 border-linha pt-6">
          <h2 className="font-sans text-lg font-bold">Contas de demonstração</h2>
          <p className="text-sm text-tinta-suave">Toque numa conta para preencher. A senha de todas é “{SENHA_DEMO}”.</p>
          <ul className="mt-3 space-y-2">
            {CONTAS_DEMO.map((c) => (
              <li key={c.email}>
                <button
                  type="button"
                  className="w-full text-left rounded-md border-2 border-linha bg-white px-4 py-2.5 hover:border-mar cursor-pointer"
                  onClick={() => {
                    setEmail(c.email)
                    setSenha(SENHA_DEMO)
                  }}
                >
                  <span className="font-bold">{c.papel}</span>
                  <span className="block text-sm text-tinta-suave">{c.email}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
