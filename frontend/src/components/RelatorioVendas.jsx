import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { formatarMoeda, mensagemDeErro } from '../lib/format'
import { Aviso, Botao, Carregando, Selecao } from './ui'

const FUSO = 'America/Recife'
const hoje = () => new Date().toLocaleDateString('en-CA', { timeZone: FUSO })

function diasAntes(dia, n) {
  const d = new Date(`${dia}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

// Atalhos de período: [rótulo, dias para trás (null = desde a primeira venda), agrupamento sugerido]
const ATALHOS = {
  '7': ['Últimos 7 dias', 6, 'dia'],
  '30': ['Últimos 30 dias', 29, 'dia'],
  '90': ['Últimos 90 dias', 89, 'semana'],
  '365': ['Últimos 12 meses', 364, 'mes'],
  tudo: ['Desde o início', null, 'mes'],
}
const AGRUPAMENTOS = { dia: 'Por dia', semana: 'Por semana', mes: 'Por mês' }

function filtrosDoAtalho(atalho) {
  const [, dias, agrupar] = ATALHOS[atalho]
  const ate = hoje()
  return dias === null ? { de: '', ate: '', agrupar } : { de: diasAntes(ate, dias), ate, agrupar }
}

const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const dataCurta = (dia) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`
const dataLonga = (dia) => `${dataCurta(dia)}/${dia.slice(0, 4)}`

function rotuloPeriodo(inicio, agrupar) {
  if (agrupar === 'mes') return `${meses[Number(inicio.slice(5, 7)) - 1]}/${inicio.slice(0, 4)}`
  if (agrupar === 'semana') return `semana de ${dataLonga(inicio)}`
  return dataLonga(inicio)
}

// ---------------------------------------------------------------------------
// CSV (separador ";" e vírgula decimal, como o Excel em português espera)
// ---------------------------------------------------------------------------
const decimal = (v) => v.toFixed(2).replace('.', ',')

function celula(valor) {
  let texto = String(valor)
  if (/^[=+\-@]/.test(texto)) texto = `'${texto}` // evita que a planilha execute fórmulas vindas de nomes de loja
  return /[";\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto
}

export function gerarCsv(relatorio) {
  const linhas = [['Seção', 'Referência', 'Pedidos', 'Total vendido', 'Comissão ISAC', 'Valor das lojas']]
  const linha = (secao, ref, v) => [secao, ref, v.pedidos, decimal(v.valor_total), decimal(v.comissao_isac), decimal(v.valor_vendedores)]
  for (const p of relatorio.por_periodo) linhas.push(linha('Período', rotuloPeriodo(p.inicio, relatorio.agrupar), p))
  for (const l of relatorio.por_loja) linhas.push(linha('Loja', l.nome, l))
  const periodo = relatorio.de || relatorio.ate ? `${relatorio.de || 'início'} a ${relatorio.ate || 'hoje'}` : 'todo o período'
  linhas.push(linha('Total', periodo, relatorio.totais))
  return '﻿' + linhas.map((l) => l.map(celula).join(';')).join('\r\n') + '\r\n'
}

function baixarCsv(relatorio) {
  const blob = new Blob([gerarCsv(relatorio)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `isac-vendas-${relatorio.de || 'inicio'}-a-${relatorio.ate || hoje()}.csv`
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ---------------------------------------------------------------------------
// Gráfico de barras: total vendido por período, com dica ao passar o mouse
// ---------------------------------------------------------------------------
function GraficoPeriodo({ periodos, agrupar }) {
  const [ativo, setAtivo] = useState(null)
  const maximo = Math.max(...periodos.map((p) => p.valor_total), 0)
  if (!periodos.length) return <p className="text-tinta-suave">Nenhuma venda confirmada no período.</p>
  const muitos = periodos.length > 40
  const destaque = ativo === null ? null : periodos[ativo]

  return (
    <figure>
      <div className="relative">
        {/* Linha de referência no maior valor e linha de base: recessivas, sem competir com as barras. */}
        <div className="flex items-baseline justify-between text-xs text-tinta-suave tabular-nums">
          <span>{formatarMoeda(maximo)}</span>
        </div>
        <div
          className={`relative h-48 border-t border-dashed border-linha border-b-2 border-b-tinta-suave/40 flex items-end ${
            muitos ? 'gap-px' : 'gap-0.5'
          }`}
          onMouseLeave={() => setAtivo(null)}
        >
          {periodos.map((p, i) => (
            <div
              key={p.inicio}
              tabIndex={0}
              role="img"
              aria-label={`${rotuloPeriodo(p.inicio, agrupar)}: ${formatarMoeda(p.valor_total)} vendidos, ${formatarMoeda(
                p.comissao_isac,
              )} de comissão, ${p.pedidos} ${p.pedidos === 1 ? 'pedido' : 'pedidos'}`}
              onMouseEnter={() => setAtivo(i)}
              onFocus={() => setAtivo(i)}
              onBlur={() => setAtivo(null)}
              className="flex-1 min-w-0 h-full flex items-end cursor-default focus:outline-none group"
            >
              <div
                className={`w-full rounded-t-[4px] transition-colors ${
                  ativo === i ? 'bg-mar-escuro' : 'bg-mar'
                } group-focus-visible:outline-2 group-focus-visible:outline-maracuja`}
                style={{ height: maximo ? `${(p.valor_total / maximo) * 100}%` : 0, minHeight: p.valor_total ? 2 : 0 }}
              />
            </div>
          ))}
        </div>
        {destaque && (
          <div
            role="status"
            className="pointer-events-none absolute top-6 z-10 rounded-md bg-tinta text-white text-sm px-3 py-2 shadow-lg whitespace-nowrap"
            style={
              ativo < periodos.length / 2
                ? { left: `${((ativo + 1) / periodos.length) * 100}%` }
                : { right: `${((periodos.length - ativo) / periodos.length) * 100}%` }
            }
          >
            <p className="font-bold">{rotuloPeriodo(destaque.inicio, agrupar)}</p>
            <p className="tabular-nums">Vendido: {formatarMoeda(destaque.valor_total)}</p>
            <p className="tabular-nums">Comissão ISAC: {formatarMoeda(destaque.comissao_isac)}</p>
            <p className="tabular-nums">
              {destaque.pedidos} {destaque.pedidos === 1 ? 'pedido' : 'pedidos'}
            </p>
          </div>
        )}
        <div className="mt-1 flex justify-between text-xs text-tinta-suave">
          <span>{rotuloPeriodo(periodos[0].inicio, agrupar)}</span>
          {periodos.length > 1 && <span>{rotuloPeriodo(periodos.at(-1).inicio, agrupar)}</span>}
        </div>
      </div>
      <figcaption className="sr-only">Total vendido em pedidos confirmados, {AGRUPAMENTOS[agrupar].toLowerCase()}.</figcaption>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-bold text-mar">Ver como tabela</summary>
        <div className="mt-3 overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-left text-sm min-w-[440px]">
            <thead className="text-tinta-suave border-b-2 border-linha sticky top-0 bg-maresia">
              <tr>
                <th className="py-2 font-normal">Período</th>
                <th className="py-2 font-normal text-right">Pedidos</th>
                <th className="py-2 font-normal text-right">Vendido</th>
                <th className="py-2 font-normal text-right">Comissão ISAC</th>
              </tr>
            </thead>
            <tbody>
              {periodos.map((p) => (
                <tr key={p.inicio} className="border-b border-linha">
                  <td className="py-1.5">{rotuloPeriodo(p.inicio, agrupar)}</td>
                  <td className="py-1.5 text-right tabular-nums">{p.pedidos}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatarMoeda(p.valor_total)}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatarMoeda(p.comissao_isac)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}

// ---------------------------------------------------------------------------
export default function RelatorioVendas() {
  const [atalho, setAtalho] = useState('30')
  const [filtros, setFiltros] = useState(() => filtrosDoAtalho('30'))
  const [relatorio, setRelatorio] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    setErro('')
    api
      .relatorioVendas(filtros)
      .then((r) => ativo && setRelatorio(r))
      .catch((e) => ativo && setErro(mensagemDeErro(e)))
    return () => {
      ativo = false
    }
  }, [filtros])

  function escolherAtalho(valor) {
    setAtalho(valor)
    if (valor !== 'personalizado') setFiltros(filtrosDoAtalho(valor))
  }

  function mudarData(campo, valor) {
    setAtalho('personalizado')
    setFiltros((f) => ({ ...f, [campo]: valor }))
  }

  const t = relatorio?.totais

  return (
    <div className="space-y-10">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-[auto_auto_auto_auto_1fr] items-end">
        <div className="col-span-2 lg:col-span-1">
          <label htmlFor="rel-periodo" className="block text-sm font-bold mb-1">
            Período
          </label>
          <Selecao id="rel-periodo" value={atalho} onChange={(e) => escolherAtalho(e.target.value)}>
            {Object.entries(ATALHOS).map(([id, [rotulo]]) => (
              <option key={id} value={id}>
                {rotulo}
              </option>
            ))}
            <option value="personalizado">Personalizado</option>
          </Selecao>
        </div>
        <div>
          <label htmlFor="rel-de" className="block text-sm font-bold mb-1">
            De
          </label>
          <input
            id="rel-de"
            type="date"
            value={filtros.de}
            max={filtros.ate || undefined}
            onChange={(e) => mudarData('de', e.target.value)}
            className="w-full rounded-md border-2 border-linha bg-white px-3 py-2 focus:border-mar focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="rel-ate" className="block text-sm font-bold mb-1">
            Até
          </label>
          <input
            id="rel-ate"
            type="date"
            value={filtros.ate}
            min={filtros.de || undefined}
            onChange={(e) => mudarData('ate', e.target.value)}
            className="w-full rounded-md border-2 border-linha bg-white px-3 py-2 focus:border-mar focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="rel-agrupar" className="block text-sm font-bold mb-1">
            Agrupar
          </label>
          <Selecao id="rel-agrupar" value={filtros.agrupar} onChange={(e) => setFiltros((f) => ({ ...f, agrupar: e.target.value }))}>
            {Object.entries(AGRUPAMENTOS).map(([id, rotulo]) => (
              <option key={id} value={id}>
                {rotulo}
              </option>
            ))}
          </Selecao>
        </div>
        <div className="lg:justify-self-end">
          <Botao variante="secundario" onClick={() => baixarCsv(relatorio)} disabled={!relatorio || Boolean(erro)} className="w-full">
            Exportar CSV
          </Botao>
        </div>
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!relatorio ? (
        !erro && <Carregando />
      ) : (
        <>
          <div>
            <h2 className="text-sm font-bold text-tinta-suave mb-3">
              Pedidos confirmados no período ({t.pedidos})
            </h2>
            <dl className="grid gap-8 sm:grid-cols-3">
              <div>
                <dt className="text-tinta-suave">Comissão do ISAC</dt>
                <dd className="mt-1">
                  <span className="etiqueta text-4xl sm:text-5xl">{formatarMoeda(t.comissao_isac)}</span>
                </dd>
              </div>
              <div className="border-l-4 border-mar pl-4">
                <dt className="text-tinta-suave">Total vendido</dt>
                <dd className="font-display text-4xl sm:text-5xl font-black tabular-nums">{formatarMoeda(t.valor_total)}</dd>
              </div>
              <div className="border-l-4 border-linha pl-4">
                <dt className="text-tinta-suave">Valor das lojas</dt>
                <dd className="font-display text-4xl sm:text-5xl font-black tabular-nums">{formatarMoeda(t.valor_vendedores)}</dd>
              </div>
            </dl>
          </div>

          <section>
            <h2 className="text-4xl font-extrabold mb-1">Vendas no período</h2>
            <p className="text-tinta-suave mb-6">Total vendido em pedidos com pagamento confirmado, pela data da confirmação.</p>
            <GraficoPeriodo periodos={relatorio.por_periodo} agrupar={relatorio.agrupar} />
          </section>

          <section>
            <h2 className="text-4xl font-extrabold mb-1">Por loja</h2>
            <p className="text-tinta-suave mb-6">Somente pedidos com pagamento confirmado no período.</p>
            {relatorio.por_loja.length === 0 ? (
              <p className="text-tinta-suave">Nenhuma venda confirmada no período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[560px]">
                  <thead className="text-sm text-tinta-suave border-b-2 border-linha">
                    <tr>
                      <th className="py-2 font-normal">Loja</th>
                      <th className="py-2 font-normal text-right">Pedidos</th>
                      <th className="py-2 font-normal text-right">Vendido</th>
                      <th className="py-2 font-normal text-right">Comissão ISAC</th>
                      <th className="py-2 font-normal text-right">Loja recebe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.por_loja.map((l) => (
                      <tr key={l.loja_id} className="border-b border-linha">
                        <td className="py-2.5 font-bold">{l.nome}</td>
                        <td className="py-2.5 text-right tabular-nums">{l.pedidos}</td>
                        <td className="py-2.5 text-right tabular-nums">{formatarMoeda(l.valor_total)}</td>
                        <td className="py-2.5 text-right tabular-nums font-bold">{formatarMoeda(l.comissao_isac)}</td>
                        <td className="py-2.5 text-right tabular-nums">{formatarMoeda(l.valor_vendedores)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
