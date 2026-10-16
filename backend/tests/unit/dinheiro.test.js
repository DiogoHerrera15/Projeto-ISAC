import test from 'node:test'
import assert from 'node:assert/strict'
import { parseDinheiro, formatarDinheiro, parseTaxa, calcularItem } from '../../src/shared/dinheiro.js'

test('comissão é arredondada por item', () => {
  const item = calcularItem(parseDinheiro('0.10'), 1, parseTaxa('5.00'))
  assert.equal(formatarDinheiro(item.comissao), '0.01')
  assert.equal(formatarDinheiro(item.vendedor), '0.09')
  assert.equal(formatarDinheiro(item.comissao + item.comissao), '0.02')
})

test('taxa 0%, 100%, limites e formatos inválidos', () => {
  assert.equal(calcularItem(123n, 1, parseTaxa('0.00')).comissao, 0n)
  assert.equal(calcularItem(123n, 1, parseTaxa('100.00')).vendedor, 0n)
  assert.equal(formatarDinheiro(parseDinheiro('9999999999.99')), '9999999999.99')
  for (const input of ['NaN', 'Infinity', '1e3', '1.001', '-1.00', '10000000000.00']) {
    assert.throws(() => parseDinheiro(input))
  }
  assert.throws(() => parseTaxa('100.01'))
  assert.throws(() => calcularItem(100n, 1000, 500n))
})
