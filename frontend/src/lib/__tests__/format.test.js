import { expect, test } from 'vitest'
import { dividirValor, lerPreco } from '../format'

test('dividirValor segue a conta do backend (centavos, metade para cima)', () => {
  expect(dividirValor(50, 5)).toEqual({ comissao: 2.5, vendedor: 47.5 })
  expect(dividirValor(0.1, 5)).toEqual({ comissao: 0.01, vendedor: 0.09 }) // 0,5 centavo arredonda para cima
  expect(dividirValor(35, 7.5)).toEqual({ comissao: 2.63, vendedor: 32.37 }) // 2,625 -> 2,63
  expect(dividirValor(19.99, 0)).toEqual({ comissao: 0, vendedor: 19.99 })
  expect(dividirValor(10, 100)).toEqual({ comissao: 10, vendedor: 0 })
})

test('dividirValor tolera valores vazios ou inválidos', () => {
  expect(dividirValor(0, 5)).toEqual({ comissao: 0, vendedor: 0 })
  expect(dividirValor(undefined, 5)).toEqual({ comissao: 0, vendedor: 0 })
  expect(dividirValor('abc', 5)).toEqual({ comissao: 0, vendedor: 0 })
})

test('lerPreco entende o formato brasileiro', () => {
  expect(lerPreco('25')).toBe(25)
  expect(lerPreco('25,5')).toBe(25.5)
  expect(lerPreco('25.50')).toBe(25.5)
  expect(lerPreco('1.234,56')).toBe(1234.56)
  expect(lerPreco('1.234')).toBe(1234)
  expect(lerPreco(' R$ 12,00 ')).toBe(12)
})

test('lerPreco recusa o que não é número', () => {
  expect(lerPreco('')).toBeNaN()
  expect(lerPreco('abc')).toBeNaN()
  expect(lerPreco('12,3,4')).toBeNaN()
  expect(lerPreco('-5')).toBeNaN()
})
