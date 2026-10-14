const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const data = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' })

export const formatarMoeda = (valor) => moeda.format(Number(valor) || 0)
export const formatarDataHora = (iso) => (iso ? dataHora.format(new Date(iso)) : '')
export const formatarData = (iso) => (iso ? data.format(new Date(iso)) : '')

/** Divide um valor entre ISAC e vendedor, com o mesmo arredondamento do banco. */
export function dividirValor(subtotal, percentual) {
  const comissao = Math.round(subtotal * percentual) / 100
  return { comissao, vendedor: Math.round((subtotal - comissao) * 100) / 100 }
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
    [/Password should be at least/i, 'A senha precisa ter pelo menos 6 caracteres.'],
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
