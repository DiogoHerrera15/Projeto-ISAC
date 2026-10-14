import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useCarrinho } from '../context/CartContext'
import { codigoPedido, dividirValor, formatarMoeda, mensagemDeErro } from '../lib/format'
import ProdutoImagem from '../components/ProdutoImagem'
import { Quantidade } from './Produto'
import { Aviso, Botao, BotaoLink, Campo, Carregando, TituloPagina, Vazio } from '../components/ui'

function PedidoRegistrado({ pedidoId }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <span className="etiqueta text-2xl">{codigoPedido(pedidoId)}</span>
      <h1 className="mt-4 text-6xl font-extrabold">Pedido registrado</h1>
      <p className="mt-4 text-lg">
        Seu pedido está aguardando a confirmação de pagamento pela equipe do ISAC. As lojas recebem seu nome e telefone para
        combinar a entrega com você.
      </p>
      <p className="mt-2 text-tinta-suave">
        Enquanto estiver aguardando pagamento, você pode cancelar o pedido em “Meus pedidos”.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <BotaoLink to="/pedidos">Ver meus pedidos</BotaoLink>
        <BotaoLink to="/produtos" variante="secundario">
          Continuar comprando
        </BotaoLink>
      </div>
    </div>
  )
}

export default function Carrinho() {
  const { usuario, perfil, recarregarPerfil } = useAuth()
  const { itens, total, quantidade, definirQuantidade, recarregar, carregando } = useCarrinho()
  const navegar = useNavigate()
  const [taxa, setTaxa] = useState(5)
  const [erro, setErro] = useState('')
  const [finalizando, setFinalizando] = useState(false)
  const [pedidoId, setPedidoId] = useState(null)
  const [telefone, setTelefone] = useState('')

  useEffect(() => {
    api.obterTaxa().then(setTaxa).catch(() => {})
  }, [])

  if (pedidoId) return <PedidoRegistrado pedidoId={pedidoId} />

  const precisaTelefone = usuario && perfil && !perfil.telefone
  const { comissao, vendedor } = dividirValor(total, taxa)

  // Agrupa os itens por loja: cada loja combina a entrega da sua parte.
  const porLoja = itens.reduce((grupos, item) => {
    const nome = item.produto?.loja?.nome || 'Loja'
    ;(grupos[nome] ||= []).push(item)
    return grupos
  }, {})

  const problemas = itens.filter(
    (i) => !i.produto || !i.produto.ativo || i.produto.loja?.ativa === false || i.quantidade > i.produto.estoque,
  )

  async function finalizar(e) {
    e.preventDefault()
    if (!usuario) {
      navegar('/entrar', { state: { voltarPara: '/carrinho' } })
      return
    }
    setErro('')
    setFinalizando(true)
    try {
      if (precisaTelefone) {
        if (telefone.replace(/\D/g, '').length < 10) {
          setErro('Informe um telefone com DDD para as lojas combinarem a entrega.')
          return
        }
        await api.atualizarPerfil(usuario.id, { nome: perfil.nome, telefone })
        await recarregarPerfil()
      }
      const id = await api.finalizarPedido()
      await recarregar()
      setPedidoId(id)
    } catch (e) {
      setErro(mensagemDeErro(e))
      await recarregar()
    } finally {
      setFinalizando(false)
    }
  }

  if (carregando && itens.length === 0) return <Carregando />

  if (itens.length === 0)
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <TituloPagina titulo="Carrinho" />
        <Vazio titulo="Seu carrinho está vazio" acao={<BotaoLink to="/produtos">Ver produtos</BotaoLink>}>
          Escolha produtos das lojas da comunidade e eles aparecem aqui.
        </Vazio>
      </div>
    )

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <TituloPagina titulo="Carrinho">
        {quantidade} {quantidade === 1 ? 'item' : 'itens'} de {Object.keys(porLoja).length}{' '}
        {Object.keys(porLoja).length === 1 ? 'loja' : 'lojas'}
      </TituloPagina>

      <div className="grid gap-10 lg:grid-cols-[1fr_340px] items-start">
        <div className="space-y-10">
          {Object.entries(porLoja).map(([loja, lista]) => (
            <section key={loja}>
              <h2 className="text-3xl font-extrabold border-b-4 border-mar pb-2">{loja}</h2>
              <ul>
                {lista.map((item) => {
                  const p = item.produto
                  const indisponivel = !p.ativo || p.loja?.ativa === false
                  return (
                    <li key={item.produto_id} className="flex gap-4 py-5 border-b border-linha">
                      <Link to={`/produtos/${p.id}`} className="shrink-0 size-24 sm:size-28 rounded-md overflow-hidden">
                        <ProdutoImagem produto={p} />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap justify-between gap-x-4">
                          <Link to={`/produtos/${p.id}`} className="font-bold text-lg hover:underline">
                            {p.nome}
                          </Link>
                          <span className="font-display text-2xl font-extrabold tabular-nums">
                            {formatarMoeda(p.preco * item.quantidade)}
                          </span>
                        </div>
                        <p className="text-sm text-tinta-suave">{formatarMoeda(p.preco)} cada</p>
                        {indisponivel ? (
                          <p className="mt-2 text-sm font-bold text-alerta">Este produto não está mais à venda.</p>
                        ) : item.quantidade > p.estoque ? (
                          <p className="mt-2 text-sm font-bold text-alerta">
                            Só {p.estoque === 1 ? 'resta 1 unidade' : `restam ${p.estoque} unidades`}. Diminua a quantidade.
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap items-center gap-4">
                          {!indisponivel && (
                            <Quantidade
                              valor={item.quantidade}
                              maximo={Math.max(p.estoque, 1)}
                              aoMudar={(q) => definirQuantidade(p, q).catch((e) => setErro(mensagemDeErro(e)))}
                              rotulo={`Quantidade de ${p.nome}`}
                            />
                          )}
                          <button
                            className="text-sm font-bold text-alerta underline underline-offset-2 cursor-pointer"
                            onClick={() => definirQuantidade(p, 0)}
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>

        <form onSubmit={finalizar} className="bg-white rounded-lg border-2 border-linha p-6 lg:sticky lg:top-24">
          <h2 className="text-3xl font-extrabold">Resumo</h2>
          <dl className="mt-4 space-y-2">
            <div className="flex justify-between">
              <dt>Produtos</dt>
              <dd className="tabular-nums">{formatarMoeda(total)}</dd>
            </div>
            <div className="flex justify-between text-tinta-suave text-sm">
              <dt>Entrega</dt>
              <dd>Combinada com cada loja</dd>
            </div>
            <div className="flex justify-between items-baseline border-t-2 border-linha pt-3 mt-3">
              <dt className="font-bold">Total</dt>
              <dd className="font-display text-4xl font-black tabular-nums">{formatarMoeda(total)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-tinta-suave">
            Deste valor, {formatarMoeda(vendedor)} ficam com as lojas e {formatarMoeda(comissao)} ({taxa.toLocaleString('pt-BR')}%)
            vão para o ISAC. Não há taxa extra para você.
          </p>

          {precisaTelefone && (
            <Campo
              className="mt-5"
              rotulo="Seu telefone (WhatsApp)"
              dica="As lojas usam este número para combinar a entrega."
              type="tel"
              autoComplete="tel"
              placeholder="(81) 99999-9999"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              required
            />
          )}

          {erro && (
            <Aviso tipo="erro" className="mt-4">
              {erro}
            </Aviso>
          )}

          <Botao
            type="submit"
            tamanho="g"
            variante="destaque"
            className="w-full mt-5"
            carregando={finalizando}
            disabled={problemas.length > 0}
          >
            {usuario ? 'Finalizar pedido' : 'Entrar para finalizar'}
          </Botao>
          {problemas.length > 0 && (
            <p className="mt-2 text-sm text-alerta font-bold">Ajuste os itens marcados em vermelho para continuar.</p>
          )}
          <p className="mt-3 text-xs text-tinta-suave">
            Nesta versão o pagamento é simulado: o pedido fica aguardando a confirmação do ISAC e nada é cobrado.
          </p>
        </form>
      </div>
    </div>
  )
}
