import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { dividirValor, formatarMoeda } from '../lib/format'
import ProdutoCard from '../components/ProdutoCard'
import { BotaoLink, Carregando } from '../components/ui'

/** Plaquinha interativa: mostra para onde vai o dinheiro de uma venda. */
function Divisao({ taxa }) {
  const [valor, setValor] = useState(50)
  const { comissao, vendedor } = dividirValor(valor, taxa)
  const pctVendedor = 100 - taxa

  return (
    <div className="bg-white text-tinta rounded-lg p-6 sm:p-8 shadow-[0_18px_0_-6px_rgba(0,0,0,0.18)] rotate-[-1.2deg]">
      <label htmlFor="valor-venda" className="block font-bold text-tinta-suave">
        Numa venda de
      </label>
      <output htmlFor="valor-venda" className="block font-display font-black text-7xl leading-none mt-1 tabular-nums">
        {formatarMoeda(valor)}
      </output>
      <input
        id="valor-venda"
        type="range"
        min="5"
        max="200"
        step="5"
        value={valor}
        onChange={(e) => setValor(Number(e.target.value))}
        className="w-full mt-4 accent-mar cursor-pointer"
      />

      <div className="mt-6 flex h-4 rounded-full overflow-hidden" aria-hidden="true">
        <div className="bg-mar" style={{ width: `${pctVendedor}%` }} />
        <div className="bg-maracuja" style={{ width: `${Math.max(taxa, 1.5)}%` }} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm text-tinta-suave">Fica com quem vendeu</dt>
          <dd className="font-display text-4xl font-extrabold text-mar tabular-nums">{formatarMoeda(vendedor)}</dd>
        </div>
        <div>
          <dt className="text-sm text-tinta-suave">Vai para o ISAC ({taxa.toLocaleString('pt-BR')}%)</dt>
          <dd className="font-display text-4xl font-extrabold tabular-nums">{formatarMoeda(comissao)}</dd>
        </div>
      </dl>
    </div>
  )
}

const PASSOS = [
  ['Quem vende publica', 'Abre a loja no site e cadastra os produtos com foto, descrição, preço e quantidade disponível.'],
  ['Quem compra faz o pedido', 'Escolhe os produtos, põe no carrinho e finaliza. O pedido fica aguardando pagamento.'],
  ['O ISAC confirma', 'A equipe do ISAC confirma o pagamento. Nesta versão a confirmação é simulada, sem cobrança real.'],
  ['A comissão é registrada', 'Com o pedido confirmado, o valor de cada vendedor e a parte do ISAC aparecem no painel.'],
]

export default function Inicio() {
  const [taxa, setTaxa] = useState(5)
  const [produtos, setProdutos] = useState(null)
  const [lojas, setLojas] = useState([])

  useEffect(() => {
    api.obterTaxa().then(setTaxa).catch(() => {})
    api.listarProdutos().then((p) => setProdutos(p.slice(0, 8))).catch(() => setProdutos([]))
    api.listarLojasAtivas().then(setLojas).catch(() => {})
  }, [])

  return (
    <>
      <section className="bg-mar text-white overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pt-12 pb-20 sm:pt-16 grid gap-12 lg:grid-cols-[1.15fr_1fr] items-center">
          <div>
            <h1 className="text-white font-black text-[clamp(3.25rem,9vw,6.25rem)] leading-[0.88] tracking-tight">
              Feito no Cabo.
              <br />
              Vendido aqui.
            </h1>
            <p className="mt-6 text-xl text-white/90 max-w-xl">
              Doces, bordados, verduras e outros produtos de quem vende na comunidade. A cada compra confirmada, uma parte vai
              para manter as atividades do ISAC.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <BotaoLink to="/produtos" variante="destaque" tamanho="g">
                Ver produtos
              </BotaoLink>
              <BotaoLink to="/minha-loja" tamanho="g" variante="claro">
                Quero vender
              </BotaoLink>
            </div>
          </div>
          <Divisao taxa={taxa} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 mt-16">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <h2 className="text-5xl font-extrabold">Chegou agora</h2>
          <Link to="/produtos" className="font-bold text-mar underline underline-offset-4 decoration-2">
            Ver todos os produtos
          </Link>
        </div>
        {produtos === null ? (
          <Carregando />
        ) : produtos.length === 0 ? (
          <p className="text-tinta-suave">Ainda não há produtos publicados. Que tal ser a primeira loja?</p>
        ) : (
          <div className="grid gap-x-4 sm:gap-x-6 gap-y-10 grid-cols-2 lg:grid-cols-4">
            {produtos.map((p) => (
              <ProdutoCard key={p.id} produto={p} />
            ))}
          </div>
        )}
      </section>

      {lojas.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 mt-24">
          <h2 className="text-5xl font-extrabold mb-8">Quem vende aqui</h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {lojas.map((l) => (
              <li key={l.id} className="border-t-4 border-mar pt-4">
                <Link to={`/produtos?loja=${l.id}`} className="font-display text-3xl font-extrabold hover:text-mar">
                  {l.nome}
                </Link>
                {l.descricao && <p className="mt-2 text-tinta-suave">{l.descricao}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="como-funciona" className="mx-auto max-w-6xl px-4 mt-24 scroll-mt-24">
        <h2 className="text-5xl font-extrabold">Como funciona</h2>
        <p className="mt-3 text-tinta-suave max-w-2xl">
          A comissão do ISAC sai do valor da venda: quem compra paga o preço anunciado, sem taxa extra. O percentual atual é de{' '}
          {taxa.toLocaleString('pt-BR')}% e pode ser ajustado pela equipe do ISAC.
        </p>
        <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {PASSOS.map(([titulo, texto], i) => (
            <li key={titulo}>
              <span className="etiqueta text-3xl">{i + 1}</span>
              <h3 className="mt-3 font-sans text-xl font-bold">{titulo}</h3>
              <p className="mt-1 text-tinta-suave">{texto}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
