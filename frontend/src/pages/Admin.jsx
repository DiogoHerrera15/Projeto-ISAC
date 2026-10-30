import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { codigoPedido, formatarDataHora, formatarMoeda, mensagemDeErro } from '../lib/format'
import StatusPedido from '../components/StatusPedido'
import { ItensDoPedido } from './MeusPedidos'
import { Abas, Aviso, Botao, Campo, Carregando, Selecao, TituloPagina, Vazio } from '../components/ui'

// ---------------------------------------------------------------------------
// Resumo
// ---------------------------------------------------------------------------
function Resumo({ pedidos, irParaPendentes }) {
  const dados = useMemo(() => {
    const confirmados = pedidos.filter((p) => p.status === 'confirmado')
    const pendentes = pedidos.filter((p) => p.status === 'pendente')
    const soma = (lista, campo) => lista.reduce((s, p) => s + p[campo], 0)
    const porLoja = {}
    for (const p of confirmados)
      for (const i of p.itens) {
        const nome = i.loja?.nome || 'Loja'
        porLoja[nome] ||= { vendido: 0, comissao: 0 }
        porLoja[nome].vendido += i.subtotal
        porLoja[nome].comissao += i.valor_comissao
      }
    const lojas = Object.entries(porLoja).sort((a, b) => b[1].comissao - a[1].comissao)
    return {
      vendido: soma(confirmados, 'valor_total'),
      comissao: soma(confirmados, 'comissao_isac'),
      vendedores: soma(confirmados, 'valor_vendedores'),
      qtdConfirmados: confirmados.length,
      pendentes,
      comissaoPendente: soma(pendentes, 'comissao_isac'),
      lojas,
      maxComissao: Math.max(...lojas.map(([, v]) => v.comissao), 0.01),
    }
  }, [pedidos])

  return (
    <div className="space-y-12">
      {dados.pendentes.length > 0 && (
        <Aviso tipo="atencao" className="flex flex-wrap items-center justify-between gap-3">
          <span>
            <strong>
              {dados.pendentes.length} {dados.pendentes.length === 1 ? 'pedido aguarda' : 'pedidos aguardam'} confirmação de
              pagamento
            </strong>{' '}
            ({formatarMoeda(dados.comissaoPendente)} de comissão a confirmar).
          </span>
          <Botao tamanho="p" onClick={irParaPendentes}>
            Ver pedidos pendentes
          </Botao>
        </Aviso>
      )}

      <div>
        <h2 className="text-sm font-bold text-tinta-suave mb-3">Pedidos confirmados ({dados.qtdConfirmados})</h2>
        <dl className="grid gap-8 sm:grid-cols-3">
          <div>
            <dt className="text-tinta-suave">Comissão do ISAC</dt>
            <dd className="mt-1">
              <span className="etiqueta text-5xl">{formatarMoeda(dados.comissao)}</span>
            </dd>
          </div>
          <div className="border-l-4 border-mar pl-4">
            <dt className="text-tinta-suave">Total vendido</dt>
            <dd className="font-display text-5xl font-black tabular-nums">{formatarMoeda(dados.vendido)}</dd>
          </div>
          <div className="border-l-4 border-linha pl-4">
            <dt className="text-tinta-suave">Valor das lojas</dt>
            <dd className="font-display text-5xl font-black tabular-nums">{formatarMoeda(dados.vendedores)}</dd>
          </div>
        </dl>
      </div>

      <div>
        <h2 className="text-4xl font-extrabold mb-1">Comissão por loja</h2>
        <p className="text-tinta-suave mb-6">Somente pedidos com pagamento confirmado.</p>
        {dados.lojas.length === 0 ? (
          <p className="text-tinta-suave">Nenhuma venda confirmada ainda.</p>
        ) : (
          <ul className="space-y-4 max-w-3xl">
            {dados.lojas.map(([nome, v]) => (
              <li key={nome} className="grid grid-cols-[minmax(8rem,12rem)_1fr] items-center gap-4">
                <span className="font-bold truncate">{nome}</span>
                <div className="flex items-center gap-3">
                  <div className="h-7 bg-mar rounded-sm" style={{ width: `${(v.comissao / dados.maxComissao) * 70}%`, minWidth: 4 }} />
                  <span className="tabular-nums whitespace-nowrap">
                    <strong>{formatarMoeda(v.comissao)}</strong>
                    <span className="text-tinta-suave text-sm"> de {formatarMoeda(v.vendido)}</span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------
function LinhaPedido({ pedido, aoAlterar }) {
  const [aberto, setAberto] = useState(false)
  const [acao, setAcao] = useState(null) // 'confirmar' | 'cancelar'
  const [cancelarAberto, setCancelarAberto] = useState(false)
  const [erro, setErro] = useState('')

  async function executar(tipo) {
    setAcao(tipo)
    setErro('')
    try {
      if (tipo === 'confirmar') await api.confirmarPagamento(pedido.id)
      else await api.cancelarPedido(pedido.id)
      await aoAlterar()
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setAcao(null)
    }
  }

  return (
    <li className="bg-white border-2 border-linha rounded-lg">
      <div className="p-4 sm:p-5 grid gap-3 sm:grid-cols-[1fr_auto] items-center">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-display text-2xl font-extrabold">{codigoPedido(pedido.id)}</span>
          <StatusPedido status={pedido.status} />
          <span className="text-sm text-tinta-suave">{formatarDataHora(pedido.criado_em)}</span>
          <span className="w-full text-sm">
            {pedido.cliente?.nome || 'Cliente'}
            {pedido.cliente?.telefone && <span className="text-tinta-suave"> · {pedido.cliente.telefone}</span>}
          </span>
        </div>
        <div className="flex items-baseline gap-4 sm:justify-end">
          <span className="font-display text-3xl font-black tabular-nums">{formatarMoeda(pedido.valor_total)}</span>
          <span className="text-sm text-tinta-suave whitespace-nowrap">ISAC {formatarMoeda(pedido.comissao_isac)}</span>
        </div>
      </div>
      <div className="px-4 sm:px-5 pb-4 flex flex-wrap items-center gap-3">
        {pedido.status === 'pendente' && !cancelarAberto && (
          <>
            <Botao tamanho="p" onClick={() => executar('confirmar')} carregando={acao === 'confirmar'}>
              Confirmar pagamento (simulado)
            </Botao>
            <Botao tamanho="p" variante="perigo" onClick={() => setCancelarAberto(true)}>
              Cancelar pedido
            </Botao>
          </>
        )}
        {cancelarAberto && pedido.status === 'pendente' && (
          <>
            <span className="font-bold">Cancelar e devolver o estoque?</span>
            <Botao tamanho="p" variante="perigo" onClick={() => executar('cancelar')} carregando={acao === 'cancelar'}>
              Sim, cancelar pedido
            </Botao>
            <Botao variante="texto" onClick={() => setCancelarAberto(false)}>
              Manter pedido
            </Botao>
          </>
        )}
        {pedido.confirmado_em && (
          <span className="text-sm text-tinta-suave">Confirmado em {formatarDataHora(pedido.confirmado_em)}</span>
        )}
        <button
          className="ml-auto text-sm font-bold text-mar underline underline-offset-2 cursor-pointer"
          aria-expanded={aberto}
          onClick={() => setAberto((v) => !v)}
        >
          {aberto ? 'Ocultar itens' : `Ver ${pedido.itens.length} ${pedido.itens.length === 1 ? 'item' : 'itens'}`}
        </button>
      </div>
      {erro && <Aviso tipo="erro" className="mx-5 mb-4">{erro}</Aviso>}
      {aberto && (
        <div className="border-t border-linha px-4 sm:px-5 py-4">
          <ItensDoPedido itens={pedido.itens} mostrarComissao />
        </div>
      )}
    </li>
  )
}

function Pedidos({ pedidos, filtro, setFiltro, aoAlterar }) {
  const lista = filtro ? pedidos.filter((p) => p.status === filtro) : pedidos
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <label htmlFor="filtro-status" className="font-bold">
          Mostrar
        </label>
        <Selecao id="filtro-status" className="max-w-xs" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">Todos os pedidos</option>
          <option value="pendente">Aguardando pagamento</option>
          <option value="confirmado">Pagamento confirmado</option>
          <option value="cancelado">Cancelados</option>
        </Selecao>
        <span className="text-tinta-suave">{lista.length} pedidos</span>
      </div>
      {lista.length === 0 ? (
        <Vazio titulo="Nenhum pedido aqui" />
      ) : (
        <ul className="space-y-4">
          {lista.map((p) => (
            <LinhaPedido key={p.id} pedido={p} aoAlterar={aoAlterar} />
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Lojas e produtos
// ---------------------------------------------------------------------------
function Interruptor({ ligado, aoMudar, rotulo }) {
  const [enviando, setEnviando] = useState(false)
  return (
    <button
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      disabled={enviando}
      onClick={async () => {
        setEnviando(true)
        try {
          await aoMudar(!ligado)
        } finally {
          setEnviando(false)
        }
      }}
      className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors cursor-pointer disabled:opacity-60 ${
        ligado ? 'bg-ok' : 'bg-linha'
      }`}
    >
      <span className={`absolute top-1 size-5 rounded-full bg-white transition-transform ${ligado ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

function Lojas() {
  const [lojas, setLojas] = useState(null)
  const [erro, setErro] = useState('')
  const carregar = useCallback(() => api.todasLojas().then(setLojas).catch((e) => setErro(mensagemDeErro(e))), [])
  useEffect(() => {
    carregar()
  }, [carregar])

  if (erro) return <Aviso tipo="erro">{erro}</Aviso>
  if (!lojas) return <Carregando />
  if (!lojas.length) return <Vazio titulo="Nenhuma loja cadastrada" />

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[640px]">
        <thead className="text-sm text-tinta-suave border-b-2 border-linha">
          <tr>
            <th className="py-2 font-normal">Loja</th>
            <th className="py-2 font-normal">Responsável</th>
            <th className="py-2 font-normal text-right">Produtos</th>
            <th className="py-2 font-normal">Aberta</th>
          </tr>
        </thead>
        <tbody>
          {lojas.map((l) => (
            <tr key={l.id} className="border-b border-linha">
              <td className="py-3">
                <Link to={`/lojas/${l.id}`} className="font-bold hover:underline">
                  {l.nome}
                </Link>
                <span className="block text-sm text-tinta-suave">desde {formatarDataHora(l.criado_em).split(' ')[0]}</span>
              </td>
              <td className="py-3">
                {l.vendedor?.nome}
                <span className="block text-sm text-tinta-suave">{l.vendedor?.telefone}</span>
              </td>
              <td className="py-3 text-right tabular-nums">{l.total_produtos}</td>
              <td className="py-3">
                <Interruptor
                  ligado={l.ativa}
                  rotulo={`Loja ${l.nome} aberta`}
                  aoMudar={async (v) => {
                    await api.atualizarLoja(l.id, { ativa: v })
                    await carregar()
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Produtos() {
  const [produtos, setProdutos] = useState(null)
  const [erro, setErro] = useState('')
  const carregar = useCallback(() => api.todosProdutos().then(setProdutos).catch((e) => setErro(mensagemDeErro(e))), [])
  useEffect(() => {
    carregar()
  }, [carregar])

  if (erro) return <Aviso tipo="erro">{erro}</Aviso>
  if (!produtos) return <Carregando />
  if (!produtos.length) return <Vazio titulo="Nenhum produto cadastrado" />

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[640px]">
        <thead className="text-sm text-tinta-suave border-b-2 border-linha">
          <tr>
            <th className="py-2 font-normal">Produto</th>
            <th className="py-2 font-normal">Loja</th>
            <th className="py-2 font-normal text-right">Preço</th>
            <th className="py-2 font-normal text-right">Estoque</th>
            <th className="py-2 font-normal">No catálogo</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((p) => (
            <tr key={p.id} className="border-b border-linha">
              <td className="py-3">
                <Link to={`/produtos/${p.id}`} className="font-bold hover:underline">
                  {p.nome}
                </Link>
              </td>
              <td className="py-3">
                {p.loja?.nome}
                {p.loja?.ativa === false && <span className="block text-sm text-alerta">loja fechada</span>}
              </td>
              <td className="py-3 text-right tabular-nums">{formatarMoeda(p.preco)}</td>
              <td className={`py-3 text-right tabular-nums ${p.estoque === 0 ? 'text-alerta font-bold' : ''}`}>{p.estoque}</td>
              <td className="py-3">
                <Interruptor
                  ligado={p.ativo}
                  rotulo={`${p.nome} no catálogo`}
                  aoMudar={async (v) => {
                    await api.atualizarProduto(p.id, { ativo: v })
                    await carregar()
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Taxa de comissão
// ---------------------------------------------------------------------------
function Taxa({ taxa, aoSalvar }) {
  const [valor, setValor] = useState(String(taxa).replace('.', ','))
  const [msg, setMsg] = useState(null)
  const [salvando, setSalvando] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    const n = Number(valor.replace(',', '.'))
    if (!(n >= 0 && n <= 100)) {
      setMsg({ tipo: 'erro', texto: 'Informe um percentual entre 0 e 100.' })
      return
    }
    setSalvando(true)
    setMsg(null)
    try {
      await api.atualizarTaxa(Math.round(n * 100) / 100)
      await aoSalvar()
      setMsg({ tipo: 'ok', texto: `Taxa alterada para ${n.toLocaleString('pt-BR')}%. Vale para os próximos pedidos.` })
    } catch (e) {
      setMsg({ tipo: 'erro', texto: mensagemDeErro(e) })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={salvar} className="max-w-md space-y-5">
      <p>
        A taxa atual é <span className="etiqueta text-2xl">{taxa.toLocaleString('pt-BR')}%</span>
      </p>
      <p className="text-tinta-suave">
        A nova taxa vale só para pedidos feitos depois da alteração. Pedidos já registrados mantêm a comissão calculada no
        momento da compra.
      </p>
      <Campo
        rotulo="Nova taxa de comissão (%)"
        inputMode="decimal"
        required
        value={valor}
        onChange={(e) => setValor(e.target.value)}
      />
      {msg && <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>}
      <Botao type="submit" carregando={salvando}>
        Salvar taxa
      </Botao>
    </form>
  )
}

// ---------------------------------------------------------------------------
export default function Admin() {
  const [aba, setAba] = useState('resumo')
  const [pedidos, setPedidos] = useState(null)
  const [taxa, setTaxa] = useState(null)
  const [filtro, setFiltro] = useState('')
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([api.todosPedidos(), api.obterTaxa()])
      setPedidos(p)
      setTaxa(t)
    } catch (e) {
      setErro(mensagemDeErro(e))
      setPedidos([])
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const pendentes = pedidos?.filter((p) => p.status === 'pendente').length || 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <TituloPagina titulo="Painel ISAC">Pedidos, lojas e comissões do ISAC Market.</TituloPagina>
      <Abas
        ativa={aba}
        aoMudar={setAba}
        abas={[
          { id: 'resumo', rotulo: 'Resumo' },
          { id: 'pedidos', rotulo: 'Pedidos', contador: pendentes || null },
          { id: 'lojas', rotulo: 'Lojas' },
          { id: 'produtos', rotulo: 'Produtos' },
          { id: 'taxa', rotulo: 'Taxa de comissão' },
        ]}
      />
      <div className="pt-8">
        {erro && <Aviso tipo="erro" className="mb-6">{erro}</Aviso>}
        {pedidos === null || taxa === null ? (
          <Carregando />
        ) : (
          <>
            {aba === 'resumo' && (
              <Resumo
                pedidos={pedidos}
                irParaPendentes={() => {
                  setFiltro('pendente')
                  setAba('pedidos')
                }}
              />
            )}
            {aba === 'pedidos' && <Pedidos pedidos={pedidos} filtro={filtro} setFiltro={setFiltro} aoAlterar={carregar} />}
            {aba === 'lojas' && <Lojas />}
            {aba === 'produtos' && <Produtos />}
            {aba === 'taxa' && <Taxa taxa={taxa} aoSalvar={carregar} />}
          </>
        )}
      </div>
    </div>
  )
}
