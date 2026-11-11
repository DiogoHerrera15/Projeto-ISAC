import { expect, test } from 'vitest'
import { montarRelatorio } from '../relatorio.js'

test('conta apenas confirmações no dia de Recife e separa itens por loja', () => {
  const confirmado = {
    status: 'confirmado', confirmado_em: '2026-11-02T02:30:00Z',
    valor_total: 30, comissao_isac: 1.5, valor_vendedores: 28.5,
    itens: [
      { loja_id: 'l1', loja: { nome: 'Loja 1' }, subtotal: 10, valor_comissao: 0.5, valor_vendedor: 9.5 },
      { loja_id: 'l2', loja: { nome: 'Loja 2' }, subtotal: 20, valor_comissao: 1, valor_vendedor: 19 },
    ],
  }
  const pendente = { ...confirmado, status: 'pendente' }
  const relatorio = montarRelatorio([confirmado, pendente], {
    de: '2026-11-01', ate: '2026-11-03', agrupar: 'dia',
  })

  expect(relatorio.totais).toEqual({ pedidos: 1, valor_total: 30, comissao_isac: 1.5, valor_vendedores: 28.5 })
  expect(relatorio.por_periodo.map(({ inicio, pedidos }) => [inicio, pedidos])).toEqual([
    ['2026-11-01', 1], ['2026-11-02', 0], ['2026-11-03', 0],
  ])
  expect(relatorio.por_loja.map(({ loja_id, pedidos, valor_total }) => [loja_id, pedidos, valor_total]))
    .toEqual([['l2', 1, 20], ['l1', 1, 10]])
})

test('rejeita intervalo invertido', () => {
  expect(() => montarRelatorio([], { de: '2026-11-02', ate: '2026-11-01' }))
    .toThrow('A data inicial deve ser anterior à final.')
})
