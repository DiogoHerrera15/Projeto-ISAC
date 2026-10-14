import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { codigoPedido, dividirValor, formatarDataHora, formatarMoeda, mensagemDeErro } from '../lib/format'
import ProdutoImagem from '../components/ProdutoImagem'
import StatusPedido from '../components/StatusPedido'
import { Abas, Aviso, Botao, BotaoLink, Campo, Carregando, TituloPagina, Vazio } from '../components/ui'

// ---------------------------------------------------------------------------
// Abrir loja
// ---------------------------------------------------------------------------
function AbrirLoja({ aoCriar, taxa }) {
  const { usuario } = useAuth()
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function criar(e) {
    e.preventDefault()
    setEnviando(true)
    setErro('')
    try {
      await api.criarLoja(usuario.id, { nome: nome.trim(), descricao: descricao.trim() })
      aoCriar()
    } catch (e) {
      setErro(mensagemDeErro(e))
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 grid gap-12 md:grid-cols-[1fr_1.1fr]">
      <div>
        <h1 className="text-6xl font-extrabold">Abra sua loja</h1>
        <p className="mt-4 text-lg">
          Publique seus produtos com foto, preço e quantidade. Quando alguém comprar, você recebe o nome e o telefone da pessoa
          para combinar a entrega.
        </p>
        <p className="mt-4 text-tinta-suave">
          Não há mensalidade. De cada venda confirmada, {taxa.toLocaleString('pt-BR')}% ficam com o ISAC para apoiar as
          atividades do instituto. Num produto de {formatarMoeda(50)}, você recebe {formatarMoeda(dividirValor(50, taxa).vendedor)}.
        </p>
      </div>
      <form onSubmit={criar} className="bg-white border-2 border-linha rounded-lg p-6 space-y-5 self-start">
        <Campo
          rotulo="Nome da loja"
          required
          placeholder="Ex.: Doces da Lúcia"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <Campo
          como="textarea"
          rotulo="Sobre a loja"
          dica="Conte o que você faz e onde fica. Aparece para quem compra."
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Botao type="submit" tamanho="g" className="w-full" carregando={enviando}>
          Abrir loja
        </Botao>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Formulário de produto
// ---------------------------------------------------------------------------
const PRODUTO_VAZIO = { nome: '', descricao: '', preco: '', estoque: '1', foto_url: '', ativo: true }

function FormProduto({ loja, produto, taxa, aoSalvar, aoCancelar }) {
  const [dados, setDados] = useState(() =>
    produto ? { ...produto, preco: String(produto.preco).replace('.', ','), estoque: String(produto.estoque) } : PRODUTO_VAZIO,
  )
  const [arquivo, setArquivo] = useState(null)
  const [previa, setPrevia] = useState(produto?.foto_url || '')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const inputArquivo = useRef(null)

  const mudar = (campo) => (e) =>
    setDados((d) => ({ ...d, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const precoTexto = String(dados.preco).trim()
  const preco = Number(precoTexto.includes(',') ? precoTexto.replace(/\./g, '').replace(',', '.') : precoTexto)
  const { vendedor } = dividirValor(preco || 0, taxa)

  function escolherFoto(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      setErro('Use uma foto em JPG, PNG ou WEBP.')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setErro('A foto pode ter no máximo 5 MB.')
      return
    }
    setErro('')
    setArquivo(f)
    setPrevia(URL.createObjectURL(f))
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    if (!(preco > 0)) {
      setErro('Informe um preço maior que zero. Ex.: 25,00')
      return
    }
    const estoque = parseInt(dados.estoque, 10)
    if (!(estoque >= 0)) {
      setErro('Informe a quantidade disponível (0 ou mais).')
      return
    }
    setEnviando(true)
    try {
      let foto_url = dados.foto_url
      if (arquivo) foto_url = await api.enviarFoto(loja.id, arquivo)
      await api.salvarProduto({
        ...dados,
        id: produto?.id,
        loja_id: loja.id,
        nome: dados.nome.trim(),
        descricao: dados.descricao?.trim(),
        preco: Math.round(preco * 100) / 100,
        estoque,
        foto_url,
      })
      aoSalvar(produto ? 'Produto atualizado.' : 'Produto publicado.')
    } catch (e) {
      setErro(mensagemDeErro(e))
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={salvar} className="bg-white border-2 border-mar rounded-lg p-6">
      <h2 className="text-4xl font-extrabold mb-6">{produto ? 'Editar produto' : 'Novo produto'}</h2>
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div>
          <p className="font-bold mb-1.5">Foto</p>
          <div className="aspect-square rounded-md overflow-hidden border-2 border-linha">
            {previa ? (
              <img src={previa} alt="Prévia da foto do produto" className="w-full h-full object-cover" />
            ) : (
              <ProdutoImagem produto={{ nome: dados.nome || 'Produto' }} />
            )}
          </div>
          <input
            ref={inputArquivo}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            id="foto-produto"
            onChange={escolherFoto}
          />
          <label htmlFor="foto-produto" className="mt-2 block text-center rounded-md border-2 border-mar px-3 py-2 font-bold text-mar hover:bg-mar-claro cursor-pointer">
            {previa ? 'Trocar foto' : 'Escolher foto'}
          </label>
          <p className="mt-1 text-xs text-tinta-suave">JPG, PNG ou WEBP, até 5 MB.</p>
        </div>
        <div className="space-y-5">
          <Campo rotulo="Nome do produto" required value={dados.nome} onChange={mudar('nome')} placeholder="Ex.: Bolo de rolo de goiaba" />
          <Campo
            como="textarea"
            rotulo="Descrição"
            dica="Tamanho, sabor, material, o que vem no pacote."
            value={dados.descricao || ''}
            onChange={mudar('descricao')}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Campo
              rotulo="Preço (R$)"
              inputMode="decimal"
              required
              placeholder="25,00"
              value={dados.preco}
              onChange={mudar('preco')}
              dica={preco > 0 ? `Você recebe ${formatarMoeda(vendedor)} por unidade.` : `${taxa.toLocaleString('pt-BR')}% ficam com o ISAC.`}
            />
            <Campo
              rotulo="Quantidade disponível"
              type="number"
              min="0"
              step="1"
              required
              value={dados.estoque}
              onChange={mudar('estoque')}
            />
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={dados.ativo} onChange={mudar('ativo')} className="mt-1 size-5 accent-mar" />
            <span>
              <span className="font-bold">Mostrar no catálogo</span>
              <span className="block text-sm text-tinta-suave">Desmarque para pausar a venda sem apagar o produto.</span>
            </span>
          </label>
        </div>
      </div>
      {erro && <Aviso tipo="erro" className="mt-6">{erro}</Aviso>}
      <div className="mt-6 flex flex-wrap gap-3">
        <Botao type="submit" carregando={enviando}>
          {produto ? 'Salvar alterações' : 'Publicar produto'}
        </Botao>
        <Botao type="button" variante="secundario" onClick={aoCancelar}>
          Cancelar
        </Botao>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Abas
// ---------------------------------------------------------------------------
function AbaProdutos({ loja, taxa }) {
  const [produtos, setProdutos] = useState(null)
  const [editando, setEditando] = useState(null) // null | 'novo' | produto
  const [aviso, setAviso] = useState('')

  const carregar = useCallback(() => {
    api.produtosDaLoja(loja.id).then(setProdutos).catch(() => setProdutos([]))
  }, [loja.id])
  useEffect(carregar, [carregar])

  if (editando)
    return (
      <FormProduto
        loja={loja}
        taxa={taxa}
        produto={editando === 'novo' ? null : editando}
        aoCancelar={() => setEditando(null)}
        aoSalvar={(msg) => {
          setEditando(null)
          setAviso(msg)
          carregar()
        }}
      />
    )

  if (!produtos) return <Carregando />

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <p className="text-tinta-suave">
          {produtos.length} {produtos.length === 1 ? 'produto' : 'produtos'}, {produtos.filter((p) => p.ativo).length} no catálogo
        </p>
        <Botao variante="destaque" onClick={() => { setAviso(''); setEditando('novo') }}>
          Novo produto
        </Botao>
      </div>
      {aviso && <Aviso tipo="ok" className="mb-6">{aviso}</Aviso>}
      {produtos.length === 0 ? (
        <Vazio titulo="Sua loja ainda está vazia" acao={<Botao onClick={() => setEditando('novo')}>Publicar primeiro produto</Botao>}>
          Comece pelo produto que mais vende. Uma boa foto ajuda muito.
        </Vazio>
      ) : (
        <ul className="divide-y divide-linha border-y border-linha">
          {produtos.map((p) => (
            <li key={p.id} className="flex items-center gap-4 py-4">
              <div className="size-16 shrink-0 rounded-md overflow-hidden">
                <ProdutoImagem produto={p} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{p.nome}</p>
                <p className="text-sm text-tinta-suave">
                  {formatarMoeda(p.preco)} · {p.estoque === 0 ? <span className="text-alerta font-bold">sem estoque</span> : `${p.estoque} em estoque`}
                  {!p.ativo && <span className="ml-2 font-bold">· pausado</span>}
                </p>
              </div>
              <Botao variante="secundario" tamanho="p" onClick={() => { setAviso(''); setEditando(p) }}>
                Editar
              </Botao>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AbaVendas() {
  const [vendas, setVendas] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    api.vendasDaMinhaLoja().then(setVendas).catch((e) => {
      setErro(mensagemDeErro(e))
      setVendas([])
    })
  }, [])

  const totais = useMemo(() => {
    const t = { confirmado: 0, pendente: 0, comissao: 0 }
    for (const v of vendas || []) {
      if (v.status === 'confirmado') {
        t.confirmado += v.valor_vendedor
        t.comissao += v.valor_comissao
      }
      if (v.status === 'pendente') t.pendente += v.valor_vendedor
    }
    return t
  }, [vendas])

  if (!vendas) return <Carregando />
  if (erro) return <Aviso tipo="erro">{erro}</Aviso>
  if (vendas.length === 0)
    return <Vazio titulo="Nenhuma venda ainda">Quando alguém pedir seus produtos, o pedido aparece aqui com o contato da pessoa.</Vazio>

  return (
    <div>
      <dl className="grid gap-6 sm:grid-cols-3 mb-10">
        <div className="border-l-4 border-mar pl-4">
          <dt className="text-tinta-suave">Você recebeu (confirmados)</dt>
          <dd className="font-display text-5xl font-black tabular-nums">{formatarMoeda(totais.confirmado)}</dd>
        </div>
        <div className="border-l-4 border-maracuja pl-4">
          <dt className="text-tinta-suave">Aguardando pagamento</dt>
          <dd className="font-display text-5xl font-black tabular-nums">{formatarMoeda(totais.pendente)}</dd>
        </div>
        <div className="border-l-4 border-linha pl-4">
          <dt className="text-tinta-suave">Sua contribuição ao ISAC</dt>
          <dd className="font-display text-5xl font-black tabular-nums">{formatarMoeda(totais.comissao)}</dd>
        </div>
      </dl>
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[680px]">
          <thead className="text-sm text-tinta-suave border-b-2 border-linha">
            <tr>
              <th className="py-2 font-normal">Pedido</th>
              <th className="py-2 font-normal">Cliente</th>
              <th className="py-2 font-normal">Produto</th>
              <th className="py-2 font-normal text-right">Qtd.</th>
              <th className="py-2 font-normal text-right">Você recebe</th>
              <th className="py-2 font-normal">Situação</th>
            </tr>
          </thead>
          <tbody>
            {vendas.map((v, i) => (
              <tr key={`${v.pedido_id}-${i}`} className="border-b border-linha align-top">
                <td className="py-3">
                  <span className="font-bold">{codigoPedido(v.pedido_id)}</span>
                  <span className="block text-sm text-tinta-suave">{formatarDataHora(v.criado_em)}</span>
                </td>
                <td className="py-3">
                  {v.cliente_nome}
                  {v.cliente_telefone && (
                    <a
                      href={`https://wa.me/55${v.cliente_telefone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-sm text-mar underline"
                    >
                      {v.cliente_telefone}
                    </a>
                  )}
                </td>
                <td className="py-3">{v.produto_nome}</td>
                <td className="py-3 text-right tabular-nums">{v.quantidade}</td>
                <td className="py-3 text-right tabular-nums font-bold">{formatarMoeda(v.valor_vendedor)}</td>
                <td className="py-3">
                  <StatusPedido status={v.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AbaDados({ loja, aoAtualizar }) {
  const [nome, setNome] = useState(loja.nome)
  const [descricao, setDescricao] = useState(loja.descricao || '')
  const [ativa, setAtiva] = useState(loja.ativa)
  const [msg, setMsg] = useState(null)
  const [salvando, setSalvando] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    setMsg(null)
    try {
      await api.atualizarLoja(loja.id, { nome: nome.trim(), descricao: descricao.trim() || null, ativa })
      setMsg({ tipo: 'ok', texto: 'Dados da loja salvos.' })
      aoAtualizar()
    } catch (e) {
      setMsg({ tipo: 'erro', texto: mensagemDeErro(e) })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={salvar} className="max-w-xl space-y-5">
      <Campo rotulo="Nome da loja" required value={nome} onChange={(e) => setNome(e.target.value)} />
      <Campo como="textarea" rotulo="Sobre a loja" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} className="mt-1 size-5 accent-mar" />
        <span>
          <span className="font-bold">Loja aberta</span>
          <span className="block text-sm text-tinta-suave">Com a loja fechada, nenhum produto seu aparece no catálogo.</span>
        </span>
      </label>
      {msg && <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>}
      <Botao type="submit" carregando={salvando}>
        Salvar dados da loja
      </Botao>
    </form>
  )
}

// ---------------------------------------------------------------------------
export default function MinhaLoja() {
  const { usuario } = useAuth()
  const [loja, setLoja] = useState(undefined)
  const [taxa, setTaxa] = useState(5)
  const [aba, setAba] = useState('produtos')

  const carregar = useCallback(() => {
    api.minhaLoja(usuario.id).then(setLoja).catch(() => setLoja(null))
  }, [usuario.id])

  useEffect(() => {
    carregar()
    api.obterTaxa().then(setTaxa).catch(() => {})
  }, [carregar])

  if (loja === undefined) return <Carregando />
  if (!loja) return <AbrirLoja taxa={taxa} aoCriar={carregar} />

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <TituloPagina
        titulo={loja.nome}
        acoes={
          <BotaoLink to={`/produtos?loja=${loja.id}`} variante="secundario">
            Ver como cliente
          </BotaoLink>
        }
      >
        {loja.ativa ? (
          'Sua loja está aberta e aparece no catálogo.'
        ) : (
          <span className="font-bold text-alerta">Sua loja está fechada: os produtos não aparecem no catálogo.</span>
        )}
      </TituloPagina>
      <Abas
        ativa={aba}
        aoMudar={setAba}
        abas={[
          { id: 'produtos', rotulo: 'Produtos' },
          { id: 'vendas', rotulo: 'Vendas' },
          { id: 'dados', rotulo: 'Dados da loja' },
        ]}
      />
      <div className="pt-8">
        {aba === 'produtos' && <AbaProdutos loja={loja} taxa={taxa} />}
        {aba === 'vendas' && <AbaVendas />}
        {aba === 'dados' && <AbaDados loja={loja} aoAtualizar={carregar} />}
      </div>
      <p className="mt-12 text-sm text-tinta-suave">
        Dúvidas sobre a comissão? Veja <Link to="/#como-funciona" className="underline">como funciona</Link>.
      </p>
    </div>
  )
}
