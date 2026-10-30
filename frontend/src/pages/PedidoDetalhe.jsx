import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../services/api'
import { codigoPedido, formatarDataHora, formatarMoeda, mensagemDeErro } from '../lib/format'
import StatusPedido from '../components/StatusPedido'
import { Aviso, Botao, BotaoLink, Carregando, Vazio } from '../components/ui'

const VOLTAR = {
  cliente: ['/pedidos', 'Meus pedidos'],
  vendedor: ['/minha-loja', 'Minha loja'],
  admin: ['/admin', 'Painel ISAC'],
}

function Acoes({ pedido, aoAlterar }) {
  const [acao, setAcao] = useState(null)
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false)
  const [erro, setErro] = useState('')
  const podeCancelar = pedido.visao === 'cliente' || pedido.visao === 'admin'
  const podeConfirmar = pedido.visao === 'admin'
  if (pedido.status !== 'pendente' || !(podeCancelar || podeConfirmar)) return null

  async function executar(tipo) {
    setAcao(tipo)
    setErro('')
    try {
      if (tipo === 'confirmar') await api.confirmarPagamento(pedido.id)
      else await api.cancelarPedido(pedido.id)
      setConfirmandoCancelamento(false)
      await aoAlterar()
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setAcao(null)
    }
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      {confirmandoCancelamento ? (
        <>
          <span className="font-bold">Cancelar e devolver o estoque?</span>
          <Botao variante="perigo" tamanho="p" onClick={() => executar('cancelar')} carregando={acao === 'cancelar'}>
            Sim, cancelar pedido
          </Botao>
          <Botao variante="texto" onClick={() => setConfirmandoCancelamento(false)}>
            Manter pedido
          </Botao>
        </>
      ) : (
        <>
          {podeConfirmar && (
            <Botao tamanho="p" onClick={() => executar('confirmar')} carregando={acao === 'confirmar'}>
              Confirmar pagamento (simulado)
            </Botao>
          )}
          <Botao variante="perigo" tamanho="p" onClick={() => setConfirmandoCancelamento(true)}>
            Cancelar pedido
          </Botao>
        </>
      )}
      {erro && <Aviso tipo="erro" className="w-full">{erro}</Aviso>}
    </div>
  )
}

export default function PedidoDetalhe() {
  const { id } = useParams()
  const [pedido, setPedido] = useState(undefined)
  const [erro, setErro] = useState('')

  const carregar = useCallback(
    () =>
      api
        .obterPedido(id)
        .then(setPedido)
        .catch((e) => {
          setErro(mensagemDeErro(e))
          setPedido(null)
        }),
    [id],
  )
  useEffect(() => {
    carregar()
  }, [carregar])

  // Divisão por loja: útil para quem comprou de mais de uma loja e para o ISAC.
  const porLoja = useMemo(() => {
    const grupos = new Map()
    for (const i of pedido?.itens ?? []) {
      const g = grupos.get(i.loja_id) || { nome: i.loja?.nome || 'Loja', id: i.loja_id, subtotal: 0, comissao: 0, vendedor: 0 }
      g.subtotal += i.subtotal
      g.comissao += i.valor_comissao
      g.vendedor += i.valor_vendedor
      grupos.set(i.loja_id, g)
    }
    return [...grupos.values()]
  }, [pedido])

  if (pedido === undefined) return <Carregando />
  if (!pedido)
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        {erro && <Aviso tipo="erro" className="mb-6">{erro}</Aviso>}
        <Vazio titulo="Pedido não encontrado" acao={<BotaoLink to="/pedidos">Ver meus pedidos</BotaoLink>}>
          O endereço pode estar incorreto ou este pedido não é seu.
        </Vazio>
      </div>
    )

  const [voltarPara, voltarRotulo] = VOLTAR[pedido.visao] || VOLTAR.cliente
  const vendedor = pedido.visao === 'vendedor'

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <nav aria-label="Caminho" className="mb-6 text-sm text-tinta-suave">
        <Link to={voltarPara} className="hover:underline">{voltarRotulo}</Link>
        {' / '}
        <span>Pedido {codigoPedido(pedido.id)}</span>
      </nav>

      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-5xl sm:text-6xl font-extrabold">{codigoPedido(pedido.id)}</h1>
        <StatusPedido status={pedido.status} />
      </header>
      <dl className="mt-3 text-sm text-tinta-suave flex flex-wrap gap-x-6 gap-y-1">
        <div>
          <dt className="inline">Feito em </dt>
          <dd className="inline">{formatarDataHora(pedido.criado_em)}</dd>
        </div>
        {pedido.confirmado_em && (
          <div>
            <dt className="inline">Pagamento confirmado em </dt>
            <dd className="inline">{formatarDataHora(pedido.confirmado_em)}</dd>
          </div>
        )}
      </dl>

      {pedido.cliente && pedido.visao !== 'cliente' && (
        <p className="mt-4">
          <span className="text-tinta-suave">Cliente: </span>
          <strong>{pedido.cliente.nome}</strong>
          {pedido.cliente.telefone && (
            <>
              {' · '}
              <a
                href={`https://wa.me/55${pedido.cliente.telefone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="text-mar underline"
              >
                {pedido.cliente.telefone}
              </a>
            </>
          )}
        </p>
      )}

      <Acoes pedido={pedido} aoAlterar={carregar} />

      {vendedor && (
        <Aviso tipo="info" className="mt-6">
          Você está vendo só os itens da sua loja neste pedido.
        </Aviso>
      )}

      <section className="mt-8">
        <h2 className="text-3xl font-extrabold mb-3">Itens</h2>
        <ul className="divide-y divide-linha border-y-2 border-linha">
          {pedido.itens.map((i) => (
            <li key={i.id} className="py-4 grid gap-1 sm:grid-cols-[1fr_auto] sm:gap-4">
              <div className="min-w-0">
                <p className="font-bold break-words">{i.nome_produto}</p>
                <p className="text-sm text-tinta-suave">
                  {!vendedor && i.loja && (
                    <>
                      <Link to={`/lojas/${i.loja.id}`} className="hover:underline">{i.loja.nome}</Link>
                      {' · '}
                    </>
                  )}
                  {i.quantidade} × {formatarMoeda(i.preco_unitario)}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="font-bold tabular-nums">{formatarMoeda(i.subtotal)}</p>
                <p className="text-sm text-tinta-suave tabular-nums">
                  ISAC {formatarMoeda(i.valor_comissao)} ({i.percentual_comissao.toLocaleString('pt-BR')}%) · loja{' '}
                  {formatarMoeda(i.valor_vendedor)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-3xl font-extrabold mb-4">{vendedor ? 'Sua parte deste pedido' : 'Divisão do valor'}</h2>
        <dl className="grid gap-6 sm:grid-cols-3">
          <div className="border-l-4 border-mar pl-4">
            <dt className="text-tinta-suave">{vendedor ? 'Vendido pela sua loja' : 'Total do pedido'}</dt>
            <dd className="font-display text-4xl font-black tabular-nums">{formatarMoeda(pedido.valor_total)}</dd>
          </div>
          <div className="border-l-4 border-maracuja pl-4">
            <dt className="text-tinta-suave">Comissão do ISAC</dt>
            <dd className="font-display text-4xl font-black tabular-nums">{formatarMoeda(pedido.comissao_isac)}</dd>
          </div>
          <div className="border-l-4 border-linha pl-4">
            <dt className="text-tinta-suave">{vendedor ? 'Você recebe' : 'Para as lojas'}</dt>
            <dd className="font-display text-4xl font-black tabular-nums">{formatarMoeda(pedido.valor_vendedores)}</dd>
          </div>
        </dl>
        {pedido.status === 'pendente' && (
          <p className="mt-4 text-sm text-tinta-suave">Os valores só passam a contar como venda depois da confirmação do pagamento.</p>
        )}
        {pedido.status === 'cancelado' && (
          <p className="mt-4 text-sm text-tinta-suave">Pedido cancelado: nenhum valor foi cobrado e o estoque foi devolvido.</p>
        )}

        {!vendedor && porLoja.length > 1 && (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[420px]">
              <caption className="text-left font-bold mb-2">Por loja</caption>
              <thead className="text-tinta-suave border-b-2 border-linha">
                <tr>
                  <th className="py-2 font-normal">Loja</th>
                  <th className="py-2 font-normal text-right">Subtotal</th>
                  <th className="py-2 font-normal text-right">ISAC</th>
                  <th className="py-2 font-normal text-right">Loja recebe</th>
                </tr>
              </thead>
              <tbody>
                {porLoja.map((g) => (
                  <tr key={g.id} className="border-b border-linha">
                    <td className="py-2">{g.nome}</td>
                    <td className="py-2 text-right tabular-nums">{formatarMoeda(g.subtotal)}</td>
                    <td className="py-2 text-right tabular-nums">{formatarMoeda(g.comissao)}</td>
                    <td className="py-2 text-right tabular-nums">{formatarMoeda(g.vendedor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
