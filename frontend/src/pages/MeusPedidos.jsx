import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { codigoPedido, formatarDataHora, formatarMoeda, mensagemDeErro } from '../lib/format'
import StatusPedido from '../components/StatusPedido'
import { Aviso, Botao, BotaoLink, Carregando, TituloPagina, Vazio } from '../components/ui'

export function ItensDoPedido({ itens, mostrarComissao = false }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-tinta-suave">
        <tr>
          <th className="py-1 font-normal">Produto</th>
          <th className="py-1 font-normal hidden sm:table-cell">Loja</th>
          <th className="py-1 font-normal text-right">Qtd.</th>
          <th className="py-1 font-normal text-right">Subtotal</th>
          {mostrarComissao && <th className="py-1 font-normal text-right">ISAC</th>}
        </tr>
      </thead>
      <tbody>
        {itens.map((i) => (
          <tr key={i.id} className="border-t border-linha">
            <td className="py-2">
              {i.nome_produto}
              <span className="block sm:hidden text-tinta-suave">{i.loja?.nome}</span>
            </td>
            <td className="py-2 hidden sm:table-cell">{i.loja?.nome}</td>
            <td className="py-2 text-right tabular-nums">{i.quantidade}</td>
            <td className="py-2 text-right tabular-nums">{formatarMoeda(i.subtotal)}</td>
            {mostrarComissao && <td className="py-2 text-right tabular-nums">{formatarMoeda(i.valor_comissao)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function CartaoPedido({ pedido, aoCancelar }) {
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  async function cancelar() {
    setEnviando(true)
    setErro('')
    try {
      await aoCancelar(pedido.id)
    } catch (e) {
      setErro(mensagemDeErro(e))
      setEnviando(false)
    }
  }

  return (
    <li className="bg-white border-2 border-linha rounded-lg p-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-display text-2xl font-extrabold">{codigoPedido(pedido.id)}</span>
        <StatusPedido status={pedido.status} />
        <span className="text-sm text-tinta-suave">{formatarDataHora(pedido.criado_em)}</span>
        <span className="ml-auto font-display text-3xl font-black tabular-nums">{formatarMoeda(pedido.valor_total)}</span>
      </div>
      <div className="mt-4">
        <ItensDoPedido itens={pedido.itens} />
      </div>
      <p className="mt-3 text-sm text-tinta-suave">
        {formatarMoeda(pedido.comissao_isac)} deste pedido {pedido.status === 'confirmado' ? 'foram' : 'serão'} para o ISAC.
      </p>
      {pedido.status === 'pendente' && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {confirmando ? (
            <>
              <span className="font-bold">Cancelar este pedido?</span>
              <Botao variante="perigo" tamanho="p" onClick={cancelar} carregando={enviando}>
                Sim, cancelar pedido
              </Botao>
              <Botao variante="texto" onClick={() => setConfirmando(false)}>
                Manter pedido
              </Botao>
            </>
          ) : (
            <Botao variante="perigo" tamanho="p" onClick={() => setConfirmando(true)}>
              Cancelar pedido
            </Botao>
          )}
        </div>
      )}
      {erro && <Aviso tipo="erro" className="mt-3">{erro}</Aviso>}
    </li>
  )
}

export default function MeusPedidos() {
  const { usuario } = useAuth()
  const [pedidos, setPedidos] = useState(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(() => {
    api
      .meusPedidos(usuario.id)
      .then(setPedidos)
      .catch((e) => {
        setErro(mensagemDeErro(e))
        setPedidos([])
      })
  }, [usuario.id])

  useEffect(carregar, [carregar])

  async function cancelar(id) {
    await api.cancelarPedido(id)
    carregar()
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <TituloPagina titulo="Meus pedidos">
        Pedidos aguardando pagamento podem ser cancelados. As lojas entram em contato pelo seu telefone para combinar a entrega.
      </TituloPagina>
      {erro && <Aviso tipo="erro" className="mb-6">{erro}</Aviso>}
      {pedidos === null ? (
        <Carregando />
      ) : pedidos.length === 0 ? (
        <Vazio titulo="Você ainda não fez pedidos" acao={<BotaoLink to="/produtos">Ver produtos</BotaoLink>} />
      ) : (
        <ul className="space-y-5">
          {pedidos.map((p) => (
            <CartaoPedido key={p.id} pedido={p} aoCancelar={cancelar} />
          ))}
        </ul>
      )}
    </div>
  )
}
