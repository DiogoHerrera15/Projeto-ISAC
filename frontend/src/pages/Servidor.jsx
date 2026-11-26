import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ehApp, normalizarUrlDaApi, salvarUrlDaApi, urlDaApi } from '../services/ambiente'
import { Aviso, Botao, Campo, TituloPagina } from '../components/ui'

// Tela do aplicativo: dizer onde está o servidor (o computador que roda o backend).
// No simulador do iPhone, "localhost" é o próprio Mac; num iPhone de verdade use o
// endereço do Mac na rede Wi-Fi (ex.: http://192.168.1.10:3001).
export default function Servidor() {
  const [texto, setTexto] = useState(urlDaApi().startsWith('http') ? urlDaApi() : '')
  const [msg, setMsg] = useState(null)
  const [testando, setTestando] = useState(false)

  async function testarESalvar(e) {
    e.preventDefault()
    setMsg(null)
    const url = normalizarUrlDaApi(texto)
    if (!url) {
      setMsg({ tipo: 'erro', texto: 'Endereço inválido. Exemplo: http://192.168.1.10:3001' })
      return
    }
    setTestando(true)
    try {
      const resposta = await fetch(`${url}/health`)
      const json = await resposta.json()
      if (!resposta.ok || json?.data?.status !== 'ok') throw new Error('resposta inesperada')
      salvarUrlDaApi(url)
      setTexto(url)
      setMsg({ tipo: 'ok', texto: `Conectado! O app vai usar ${url}.` })
    } catch {
      setMsg({
        tipo: 'erro',
        texto: 'Não consegui falar com esse endereço. Confira se o backend está ligado, se o aparelho está na mesma rede Wi-Fi e se a porta está certa.',
      })
    } finally {
      setTestando(false)
    }
  }

  function restaurarPadrao() {
    salvarUrlDaApi('')
    setTexto('')
    setMsg({ tipo: 'ok', texto: 'Voltou ao endereço padrão do app.' })
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <TituloPagina titulo="Servidor">
        Onde está o backend do ISAC Market. Em desenvolvimento, é o computador que roda <code>npm run dev</code> na pasta backend.
      </TituloPagina>
      {!ehApp && (
        <Aviso tipo="atencao" className="mb-6">
          Esta tela serve para o aplicativo instalado. No site, o servidor é sempre o próprio endereço do site.
        </Aviso>
      )}
      <form onSubmit={testarESalvar} className="space-y-5">
        <Campo
          rotulo="Endereço do servidor"
          dica="Simulador: http://localhost:3001 · iPhone de verdade: http://IP-DO-MAC:3001"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="http://192.168.1.10:3001"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <p className="text-sm text-tinta-suave">Em uso agora: <code>{urlDaApi()}</code></p>
        {msg && <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>}
        <div className="flex flex-wrap gap-3">
          <Botao type="submit" carregando={testando}>
            Testar e salvar
          </Botao>
          <Botao type="button" variante="secundario" onClick={restaurarPadrao}>
            Usar o padrão
          </Botao>
        </div>
      </form>
      <Link to="/" className="mt-8 inline-block font-bold text-mar underline underline-offset-4">
        Voltar ao início
      </Link>
    </div>
  )
}
