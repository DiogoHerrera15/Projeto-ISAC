import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../services/api'
import { ORDENS_PRODUTOS, formatarData, mensagemDeErro } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import ProdutoCard from '../components/ProdutoCard'
import { useProdutosPaginados } from '../lib/useProdutosPaginados'
import { Aviso, BotaoLink, Carregando, MaisProdutos, Selecao, Vazio } from '../components/ui'

export default function Loja() {
  const { id } = useParams()
  const { usuario } = useAuth()
  const [loja, setLoja] = useState(undefined)
  const [ordem, setOrdem] = useState('recentes')
  const [erro, setErro] = useState('')
  const lista = useProdutosPaginados({ lojaId: id, ordem })
  const { produtos } = lista

  useEffect(() => {
    setLoja(undefined)
    api.obterLoja(id).then(setLoja).catch((e) => {
      setErro(mensagemDeErro(e))
      setLoja(null)
    })
  }, [id, usuario?.id])

  if (loja === undefined) return <Carregando />
  if (!loja)
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        {erro && <Aviso tipo="erro" className="mb-6">{erro}</Aviso>}
        <Vazio titulo="Loja não encontrada" acao={<BotaoLink to="/produtos">Ver todos os produtos</BotaoLink>}>
          Ela pode estar fechada no momento ou o endereço está incorreto.
        </Vazio>
      </div>
    )

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav aria-label="Caminho" className="mb-6 text-sm text-tinta-suave">
        <Link to="/produtos" className="hover:underline">Produtos</Link>
        {' / '}
        <span>{loja.nome}</span>
      </nav>

      <header className="border-b-2 border-linha pb-8 mb-8">
        <p className="font-bold text-mar">Loja da comunidade</p>
        <h1 className="mt-1 text-5xl sm:text-6xl font-extrabold break-words">{loja.nome}</h1>
        {loja.descricao && <p className="mt-4 text-lg max-w-prose whitespace-pre-line">{loja.descricao}</p>}
        <p className="mt-4 text-sm text-tinta-suave">
          {loja.total_produtos} {loja.total_produtos === 1 ? 'produto à venda' : 'produtos à venda'}
          {loja.criado_em && <> · no ISAC Market desde {formatarData(loja.criado_em)}</>}
        </p>
        {!loja.ativa && (
          <Aviso tipo="atencao" className="mt-6">
            Esta loja está fechada: só você (ou a equipe do ISAC) consegue ver esta página, e os produtos não aparecem no catálogo.
          </Aviso>
        )}
      </header>

      {lista.erro && <Aviso tipo="erro" className="mb-6">{lista.erro}</Aviso>}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-3xl font-extrabold">Produtos</h2>
        <div className="w-full sm:w-auto">
          <label htmlFor="ordem-loja" className="sr-only">
            Ordenar
          </label>
          <Selecao id="ordem-loja" value={ordem} onChange={(e) => setOrdem(e.target.value)}>
            {Object.entries(ORDENS_PRODUTOS).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </Selecao>
        </div>
      </div>

      {produtos === null ? (
        <Carregando texto="Buscando produtos…" />
      ) : produtos.length === 0 ? (
        <Vazio titulo="Nenhum produto à venda agora">Volte em breve: a loja pode estar preparando novidades.</Vazio>
      ) : (
        <>
          <div className="grid gap-x-4 sm:gap-x-6 gap-y-10 grid-cols-2 lg:grid-cols-4">
            {produtos.map((p) => (
              <ProdutoCard key={p.id} produto={p} />
            ))}
          </div>
          <MaisProdutos
            mostrando={produtos.length}
            total={lista.total}
            temMais={lista.temMais}
            carregarMais={lista.carregarMais}
            carregando={lista.carregandoMais}
          />
        </>
      )}
    </div>
  )
}
