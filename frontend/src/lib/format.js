const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const data = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' })

export const formatarMoeda = (valor) => moeda.format(Number(valor) || 0)
export const formatarDataHora = (iso) => (iso ? dataHora.format(new Date(iso)) : '')
export const formatarData = (iso) => (iso ? data.format(new Date(iso)) : '')

const emCentavos = (valor) => (Number.isFinite(Number(valor)) ? Math.round(Number(valor) * 100) : 0)

/**
 * Divide um valor entre ISAC e vendedor com a mesma conta do backend: centavos
 * inteiros e comissão arredondada para cima na metade (shared/dinheiro.js).
 * Sem ponto flutuante, a estimativa da tela não difere do pedido real.
 */
export function dividirValor(subtotal, percentual) {
  const centavos = BigInt(emCentavos(subtotal))
  const pontos = BigInt(emCentavos(percentual)) // 5,5% = 550 pontos-base
  const comissao = Number((centavos * pontos + 5000n) / 10000n)
  return { comissao: comissao / 100, vendedor: (Number(centavos) - comissao) / 100 }
}

/**
 * Lê um preço digitado em formato brasileiro. Aceita "25", "25,5", "25.50",
 * "1.234,56" e "1.234" (ponto seguido de 3 dígitos = milhar). Devolve NaN se inválido.
 */
export function lerPreco(texto) {
  const limpo = String(texto ?? '').replace(/\s/g, '').replace(/^R\$/i, '')
  if (!limpo) return NaN
  let normal = limpo
  if (limpo.includes(',')) normal = limpo.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) normal = limpo.replace(/\./g, '')
  return /^\d+(\.\d+)?$/.test(normal) ? Number(normal) : NaN
}

/** Ordens do catálogo; quem ordena é a camada de dados (backend ou demo). */
export const ORDENS_PRODUTOS = {
  recentes: 'Mais recentes',
  menor: 'Menor preço',
  maior: 'Maior preço',
  nome: 'Nome (A–Z)',
}

/** Código curto e legível para um pedido (primeiros caracteres do UUID). */
export const codigoPedido = (id) => `#${String(id).slice(0, 8).toUpperCase()}`

/** Converte mensagens do banco (sem acentos) em textos claros para a pessoa usuária. */
export function mensagemDeErro(erro) {
  const msg = (erro && (erro.message || erro.error_description || String(erro))) || ''
  const mapa = [
    [/Invalid login credentials/i, 'E-mail ou senha incorretos.'],
    [/Email not confirmed/i, 'Confirme seu e-mail pelo link que enviamos antes de entrar.'],
    [/User already registered/i, 'Já existe uma conta com este e-mail. Entre com sua senha.'],
    [/Password should be at least/i, 'A senha precisa ter pelo menos 8 caracteres.'],
    [/carrinho esta vazio/i, 'Seu carrinho está vazio.'],
    [/Estoque insuficiente para: (.*)/i, (m) => `Não há estoque suficiente de “${m[1]}”. Diminua a quantidade.`],
    [/Produto ou loja indisponivel: (.*)/i, (m) => `“${m[1]}” não está mais disponível. Remova do carrinho para continuar.`],
    [/Faca login/i, 'Entre na sua conta para continuar.'],
    [/Somente um administrador/i, 'Só a equipe do ISAC pode confirmar pagamentos.'],
    [/nao esta pendente/i, 'Este pedido não está mais pendente.'],
    [/Apenas pedidos pendentes/i, 'Só é possível cancelar pedidos pendentes.'],
    [/duplicate key.*lojas_vendedor_id/i, 'Você já tem uma loja cadastrada.'],
    [/Failed to fetch/i, 'Não foi possível conectar ao servidor. Verifique sua internet.'],
  ]
  for (const [re, texto] of mapa) {
    const m = msg.match(re)
    if (m) return typeof texto === 'function' ? texto(m) : texto
  }
  return msg || 'Algo deu errado. Tente novamente.'
}
