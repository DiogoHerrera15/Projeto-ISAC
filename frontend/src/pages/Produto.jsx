import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../services/api'
import { dividirValor, formatarMoeda, mensagemDeErro } from '../lib/format'
import { useCarrinho } from '../context/CartContext'
import Etiqueta from '../components/Etiqueta'
import ProdutoImagem from '../components/ProdutoImagem'
import { Aviso, Botao, BotaoLink, Carregando, Vazio } from '../components/ui'

export function Quantidade({ valor, maximo, aoMudar, rotulo = 'Quantidade', desabilitado }) {
  return (
    <div className="inline-flex items-center rounded-md border-2 border-linha bg-white" role="group" aria-label={rotulo}>
      <button
        type="button"
        className="size-10 text-xl font-bold text-mar disabled:text-linha cursor-pointer disabled:cursor-not-allowed"
        onClick={() => aoMudar(valor - 1)}
        disabled={desabilitado || valor <= 1}
        aria-label="Diminuir"
      >
        −
      </button>
      <span className="w-10 text-center font-bold tabular-nums" aria-live="polite">
        {valor}
      </span>
      <button
        type="button"
        className="size-10 text-xl font-bold text-mar disabled:text-linha cursor-pointer disabled:cursor-not-allowed"
        onClick={() => aoMudar(valor + 1)}
        disabled={desabilitado || valor >= maximo}
        aria-label="Aumentar"
      >
        +
      </button>
    </div>
  )
}

export default function Produto() {
  const { id } = useParams()
  const { adicionar, itens } = useCarrinho()
  const [produto, setProduto] = useState(undefined)
  const [taxa, setTaxa] = useState(5)
  const [qtd, setQtd] = useState(1)
  const [mensagem, setMensagem] = useState(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    api.obterProduto(id).then(setProduto).catch(() => setProduto(null))
    api.obterTaxa().then(setTaxa).catch(() => {})
  }, [id])

  if (produto === undefined) return <Carregando />
  if (!produto)
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <Vazio titulo="Produto não encontrado" acao={<BotaoLink to="/produtos">Ver todos os produtos</BotaoLink>}>
          Ele pode ter sido retirado da loja ou o endereço está incorreto.
        </Vazio>
      </div>
    )

  const noCarrinho = itens.find((i) => i.produto_id === produto.id)?.quantidade || 0
  const disponivel = Math.max(0, produto.estoque - noCarrinho)
  const { comissao } = dividirValor(produto.preco * qtd, taxa)

  async function aoAdicionar() {
    setEnviando(true)
    setMensagem(null)
    try {
      await adicionar(produto, qtd)
      setMensagem({ tipo: 'ok', texto: `${qtd} ${qtd === 1 ? 'unidade adicionada' : 'unidades adicionadas'} ao carrinho.` })
      setQtd(1)
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: mensagemDeErro(e) })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav aria-label="Caminho" className="mb-6 text-sm text-tinta-suave">
        <Link to="/produtos" className="hover:underline">Produtos</Link>
        {produto.loja && (
          <>
            {' / '}
            <Link to={`/produtos?loja=${produto.loja.id}`} className="hover:underline">{produto.loja.nome}</Link>
          </>
        )}
      </nav>
      <div className="grid gap-10 md:grid-cols-2 items-start">
        <div className="rounded-lg overflow-hidden aspect-square">
          <ProdutoImagem produto={produto} />
        </div>
        <div>
          {produto.loja && (
            <Link to={`/produtos?loja=${produto.loja.id}`} className="font-bold text-mar hover:underline">
              {produto.loja.nome}
            </Link>
          )}
          <h1 className="mt-1 text-5xl sm:text-6xl font-extrabold">{produto.nome}</h1>
          {produto.categoria && (
            <Link
              to={`/produtos?categoria=${produto.categoria.id}`}
              className="mt-3 inline-block rounded-full border border-linha bg-white px-3 py-0.5 text-sm font-bold text-tinta-suave hover:border-mar hover:text-mar"
            >
              {produto.categoria.nome}
            </Link>
          )}
          <div className="mt-5">
            <Etiqueta valor={produto.preco} tamanho="g" />
          </div>
          {produto.descricao && <p className="mt-6 text-lg max-w-prose whitespace-pre-line">{produto.descricao}</p>}

          {!produto.ativo && (
            <Aviso tipo="atencao" className="mt-6">Este produto está pausado e não aparece no catálogo.</Aviso>
          )}

          <div className="mt-8 border-t-2 border-linha pt-6">
            {produto.estoque <= 0 ? (
              <p className="font-display text-3xl font-extrabold text-tinta-suave">Esgotado</p>
            ) : disponivel === 0 ? (
              <p className="font-bold">
                Você já tem todo o estoque deste produto no <Link to="/carrinho" className="text-mar underline">carrinho</Link>.
              </p>
            ) : (
              <>
                <p className="text-tinta-suave mb-3">
                  {produto.estoque} {produto.estoque === 1 ? 'unidade disponível' : 'unidades disponíveis'}
                  {noCarrinho > 0 && `, ${noCarrinho} já no seu carrinho`}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Quantidade valor={Math.min(qtd, disponivel)} maximo={disponivel} aoMudar={setQtd} />
                  <Botao tamanho="g" variante="primario" onClick={aoAdicionar} carregando={enviando}>
                    Adicionar ao carrinho
                  </Botao>
                </div>
                <p className="mt-4 text-sm text-tinta-suave">
                  Desta compra, {formatarMoeda(comissao)} vão para o ISAC. O restante fica com {produto.loja?.nome || 'a loja'}.
                </p>
              </>
            )}
            {mensagem && (
              <Aviso tipo={mensagem.tipo} className="mt-4">
                {mensagem.texto}{' '}
                {mensagem.tipo === 'ok' && (
                  <Link to="/carrinho" className="font-bold underline">Ir para o carrinho</Link>
                )}
              </Aviso>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
