import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../services/api'
import { mensagemDeErro } from '../lib/format'
import { Aviso, Botao, BotaoLink, Campo } from '../components/ui'

export default function RedefinirSenha() {
  const [params] = useSearchParams()
  // O token vem no link do e-mail; guardamos só na memória e tiramos do endereço
  // para não ficar no histórico do navegador nem em capturas de tela.
  const [token] = useState(() => params.get('token') || '')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [linkInvalido, setLinkInvalido] = useState(false) // só então faz sentido oferecer um novo link
  const [enviando, setEnviando] = useState(false)
  const [concluido, setConcluido] = useState(false)

  useEffect(() => {
    if (window.location.search) window.history.replaceState(window.history.state, '', window.location.pathname)
  }, [])

  async function aoEnviar(e) {
    e.preventDefault()
    setErro('')
    setLinkInvalido(false)
    if (senha.length < 8) {
      setErro('A senha precisa ter pelo menos 8 caracteres.')
      return
    }
    if (senha !== confirmacao) {
      setErro('As senhas não são iguais.')
      return
    }
    setEnviando(true)
    try {
      await api.redefinirSenha({ token, novaSenha: senha })
      setConcluido(true)
    } catch (e) {
      setErro(mensagemDeErro(e))
      setLinkInvalido(e?.codigo === 'TOKEN_INVALIDO' || /inválido ou expirou/.test(e?.message || ''))
    } finally {
      setEnviando(false)
    }
  }

  if (concluido)
    return (
      <div className="mx-auto max-w-md px-4 py-14">
        <h1 className="text-6xl font-extrabold">Senha alterada</h1>
        <p className="mt-4 text-lg">Pronto! Entre com a nova senha. Os aparelhos que estavam conectados foram desconectados.</p>
        <BotaoLink to="/entrar" tamanho="g" className="mt-6">
          Entrar
        </BotaoLink>
      </div>
    )

  if (!token)
    return (
      <div className="mx-auto max-w-md px-4 py-14">
        <h1 className="text-6xl font-extrabold">Link incompleto</h1>
        <p className="mt-4 text-lg">Abra o link exatamente como veio no e-mail, ou peça um novo.</p>
        <BotaoLink to="/esqueci-senha" className="mt-6">
          Pedir novo link
        </BotaoLink>
      </div>
    )

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-6xl font-extrabold">Nova senha</h1>
      <p className="mt-2 text-tinta-suave">Escolha uma senha com pelo menos 8 caracteres.</p>
      <form onSubmit={aoEnviar} className="mt-8 space-y-5">
        <Campo
          rotulo="Nova senha"
          type="password"
          autoComplete="new-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <Campo
          rotulo="Repita a nova senha"
          type="password"
          autoComplete="new-password"
          required
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
        />
        {erro && (
          <Aviso tipo="erro">
            {erro}
            {linkInvalido && (
              <>
                {' '}
                <Link to="/esqueci-senha" className="font-bold underline">
                  Pedir novo link
                </Link>
              </>
            )}
          </Aviso>
        )}
        <Botao type="submit" tamanho="g" className="w-full" carregando={enviando}>
          Salvar nova senha
        </Botao>
      </form>
    </div>
  )
}
