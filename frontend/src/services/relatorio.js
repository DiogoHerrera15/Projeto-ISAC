// Relatório de vendas calculado no navegador (modos demo e Supabase). Segue as
// regras do backend: só pedidos confirmados, contados pela data da confirmação
// no fuso de Recife, com os períodos sem venda incluídos na série.
const FUSO = 'America/Recife'
const diaLocal = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: FUSO })

const paraData = (dia) => new Date(`${dia}T00:00:00Z`)
const paraDia = (data) => data.toISOString().slice(0, 10)
const centavos = (v) => Math.round(v * 100) / 100

function inicioDoPeriodo(dia, agrupar) {
  const d = paraData(dia)
  if (agrupar === 'semana') d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)) // semana começa na segunda
  if (agrupar === 'mes') d.setUTCDate(1)
  return paraDia(d)
}

function proximoPeriodo(dia, agrupar) {
  const d = paraData(dia)
  if (agrupar === 'mes') d.setUTCMonth(d.getUTCMonth() + 1)
  else d.setUTCDate(d.getUTCDate() + (agrupar === 'semana' ? 7 : 1))
  return paraDia(d)
}

const zerado = () => ({ pedidos: 0, valor_total: 0, comissao_isac: 0, valor_vendedores: 0 })

function arredondar(linha) {
  for (const campo of ['valor_total', 'comissao_isac', 'valor_vendedores']) linha[campo] = centavos(linha[campo])
  return linha
}

export function montarRelatorio(pedidos, { de = '', ate = '', agrupar = 'dia' } = {}) {
  if (de && ate && de > ate) throw new Error('A data inicial deve ser anterior à final.')
  const vendas = pedidos
    .filter((p) => p.status === 'confirmado' && p.confirmado_em)
    .map((p) => ({ ...p, dia: diaLocal(p.confirmado_em) }))
    .filter((p) => (!de || p.dia >= de) && (!ate || p.dia <= ate))

  const totais = zerado()
  const periodos = new Map()
  const lojas = new Map()
  for (const p of vendas) {
    totais.pedidos += 1
    totais.valor_total += p.valor_total
    totais.comissao_isac += p.comissao_isac
    totais.valor_vendedores += p.valor_vendedores
    const chave = inicioDoPeriodo(p.dia, agrupar)
    const periodo = periodos.get(chave) || zerado()
    periodo.pedidos += 1
    periodo.valor_total += p.valor_total
    periodo.comissao_isac += p.comissao_isac
    periodo.valor_vendedores += p.valor_vendedores
    periodos.set(chave, periodo)
    const pedidosDaLoja = new Set()
    for (const i of p.itens) {
      const loja = lojas.get(i.loja_id) || { loja_id: i.loja_id, nome: i.loja?.nome || 'Loja', ...zerado() }
      if (!pedidosDaLoja.has(i.loja_id)) loja.pedidos += 1
      pedidosDaLoja.add(i.loja_id)
      loja.valor_total += i.subtotal
      loja.comissao_isac += i.valor_comissao
      loja.valor_vendedores += i.valor_vendedor
      lojas.set(i.loja_id, loja)
    }
  }

  const dias = vendas.map((p) => p.dia).sort()
  const inicio = de || dias[0]
  const fim = ate || dias.at(-1)
  const por_periodo = []
  if (inicio && fim && inicio <= fim) {
    for (let d = inicioDoPeriodo(inicio, agrupar); d <= fim; d = proximoPeriodo(d, agrupar)) {
      por_periodo.push(arredondar({ inicio: d, ...(periodos.get(d) || zerado()) }))
      if (por_periodo.length > 400) throw new Error('Período muito longo para esse agrupamento. Agrupe por semana ou mês.')
    }
  }
  const por_loja = [...lojas.values()]
    .map(arredondar)
    .sort((a, b) => b.comissao_isac - a.comissao_isac || a.nome.localeCompare(b.nome))
  return { de: de || null, ate: ate || null, agrupar, totais: arredondar(totais), por_periodo, por_loja }
}
