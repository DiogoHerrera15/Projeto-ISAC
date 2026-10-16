const MAX_CENTAVOS = 999999999999n

export function parseDinheiro(texto) {
  if (typeof texto !== 'string' || !/^(0|[1-9]\d{0,9})\.\d{2}$/.test(texto)) {
    throw new Error('Valor monetário inválido')
  }
  const centavos = BigInt(texto.replace('.', ''))
  if (centavos > MAX_CENTAVOS) throw new Error('Valor monetário excede o limite')
  return centavos
}

export function formatarDinheiro(centavos) {
  if (typeof centavos !== 'bigint' || centavos < 0n || centavos > MAX_CENTAVOS) {
    throw new Error('Valor monetário excede o limite')
  }
  const value = centavos.toString().padStart(3, '0')
  return `${value.slice(0, -2)}.${value.slice(-2)}`
}

export function parseTaxa(texto) {
  if (typeof texto !== 'string' || !/^(0|[1-9]\d{0,2})\.\d{2}$/.test(texto)) {
    throw new Error('Taxa inválida')
  }
  const points = BigInt(texto.replace('.', ''))
  if (points > 10000n) throw new Error('Taxa inválida')
  return points
}

export function calcularItem(precoCentavos, quantidade, taxaPontosBase) {
  if (typeof precoCentavos !== 'bigint' || precoCentavos <= 0n ||
      !Number.isInteger(quantidade) || quantidade < 1 || quantidade > 999 ||
      typeof taxaPontosBase !== 'bigint' || taxaPontosBase < 0n || taxaPontosBase > 10000n) {
    throw new Error('Item inválido')
  }
  const subtotal = precoCentavos * BigInt(quantidade)
  formatarDinheiro(subtotal)
  const comissao = (subtotal * taxaPontosBase + 5000n) / 10000n
  return { subtotal, comissao, vendedor: subtotal - comissao }
}
