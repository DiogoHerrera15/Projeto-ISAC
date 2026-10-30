// Implementação da camada de dados usando o backend Node do projeto
// (backend/src, rotas em /api/v1). A sessão vai em cookie HttpOnly, então as
// chamadas precisam sair da mesma origem do site (proxy do Vite em
// desenvolvimento, ou o próprio backend servindo o frontend em produção).
// As regras de negócio ficam no backend; aqui só traduzimos as respostas para
// o formato que as páginas já usam.

const BASE = (import.meta.env?.VITE_API_URL || '/api/v1').replace(/\/$/, '')

export class ErroApi extends Error {
  constructor(status, codigo, mensagem, detalhes) {
    super(mensagem)
    this.status = status
    this.codigo = codigo
    this.detalhes = detalhes
  }
}

const num = (v) => Number(v ?? 0)

function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const b = globalThis.crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

// ---------- Sessão ----------
// O cookie é HttpOnly, então o navegador não "avisa" quando a sessão muda.
// Guardamos o usuário atual e avisamos quem estiver ouvindo (AuthContext).
let usuarioAtual = null
const ouvintes = new Set()

function definirUsuario(usuario) {
  usuarioAtual = usuario
  for (const ouvinte of ouvintes) ouvinte(usuario)
}

async function requisicao(metodo, caminho, { corpo, consulta, cabecalhos, formulario } = {}) {
  const url = new URL(`${BASE}${caminho}`, window.location.origin)
  for (const [chave, valor] of Object.entries(consulta ?? {})) {
    if (valor !== undefined && valor !== null && valor !== '') url.searchParams.set(chave, valor)
  }
  const headers = { 'X-ISAC-Client': 'web', ...cabecalhos }
  let body
  if (formulario) {
    body = formulario
  } else if (corpo !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(corpo)
  }
  const resposta = await fetch(url, { method: metodo, headers, body, credentials: 'same-origin' })
  if (resposta.status === 204) return null
  const json = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    const e = json?.error
    // Sessão expirada em outra aba ou no servidor: a tela volta ao estado "deslogado".
    if (resposta.status === 401 && e?.code === 'NAO_AUTENTICADO' && usuarioAtual) definirUsuario(null)
    throw new ErroApi(resposta.status, e?.code, e?.message || 'Algo deu errado. Tente novamente.', e?.details)
  }
  return json
}

async function listarTudo(caminho, consulta = {}) {
  const itens = []
  for (let pagina = 1; ; pagina += 1) {
    const { data, meta } = await requisicao('GET', caminho, { consulta: { ...consulta, pagina, limite: 100 } })
    itens.push(...data)
    if (data.length === 0 || itens.length >= meta.total) return itens
  }
}

// ---------- Normalização ----------
// O backend devolve valores em dinheiro como texto ("35.00"); as telas usam número.
function normalizarProduto(p) {
  return p ? { ...p, preco: num(p.preco) } : null
}

function normalizarPedido(p) {
  return {
    ...p,
    valor_total: num(p.valor_total),
    comissao_isac: num(p.comissao_isac),
    valor_vendedores: num(p.valor_vendedores),
    cliente: p.cliente ?? null,
    itens: (p.itens ?? []).map((i) => ({
      ...i,
      preco_unitario: num(i.preco_unitario),
      subtotal: num(i.subtotal),
      percentual_comissao: num(i.percentual_comissao),
      valor_comissao: num(i.valor_comissao),
      valor_vendedor: num(i.valor_vendedor),
    })),
  }
}

// O backend altera produtos com controle de versão (evita sobrescrever edições
// simultâneas). Guardamos a última versão vista de cada produto, para as telas
// que só informam o id (ex.: o administrador pausando um produto).
const versoes = new Map()

function lembrarVersoes(produtos) {
  for (const p of produtos) if (p?.versao) versoes.set(p.id, p.versao)
  return produtos
}

const ID_DA_IMAGEM = /\/imagens\/([0-9a-f-]{36})$/i

// O campo foto_url guarda o endereço da imagem enviada (/api/v1/imagens/<id>);
// o backend quer o id da imagem.
function imagemDe(fotoUrl) {
  if (!fotoUrl) return { imagem_id: null }
  const achou = String(fotoUrl).match(ID_DA_IMAGEM)
  return achou ? { imagem_id: achou[1] } : {}
}

// Se o checkout falhar sem resposta (rede), a nova tentativa reaproveita a chave
// e o backend devolve o mesmo pedido em vez de criar outro.
let chaveCheckout = null

export const backendApi = {
  modo: 'backend',

  // ---------- Autenticação e perfil ----------
  async obterUsuario() {
    const { data } = await requisicao('GET', '/auth/sessao')
    usuarioAtual = data ? { id: data.usuario.id, email: data.usuario.email } : null
    return usuarioAtual
  },

  aoMudarAutenticacao(callback) {
    ouvintes.add(callback)
    return () => ouvintes.delete(callback)
  },

  async cadastrar({ nome, email, senha, telefone }) {
    const { data } = await requisicao('POST', '/auth/cadastro', {
      corpo: { nome, email, senha, telefone: telefone || null },
    })
    definirUsuario({ id: data.usuario.id, email: data.usuario.email })
    return { precisaConfirmarEmail: Boolean(data.precisaConfirmarEmail) }
  },

  async entrar({ email, senha }) {
    const { data } = await requisicao('POST', '/auth/login', { corpo: { email, senha } })
    definirUsuario({ id: data.usuario.id, email: data.usuario.email })
  },

  async sair() {
    await requisicao('POST', '/auth/logout')
    definirUsuario(null)
  },

  async obterPerfil() {
    return (await requisicao('GET', '/perfil')).data
  },

  async atualizarPerfil(_id, { nome, telefone }) {
    await requisicao('PATCH', '/perfil', { corpo: { nome, telefone: telefone || null } })
  },

  // ---------- Catálogo ----------
  async listarProdutos({ busca = '', lojaId = '', categoria = '', ordem = 'recentes' } = {}) {
    const produtos = await listarTudo('/produtos', { busca: busca.trim(), lojaId, categoria, ordem })
    return produtos.map(normalizarProduto)
  },

  async listarCategorias() {
    return (await requisicao('GET', '/categorias')).data
  },

  async obterProduto(id) {
    try {
      return normalizarProduto((await requisicao('GET', `/produtos/${id}`)).data)
    } catch (e) {
      if (e.status === 404) return null
      throw e
    }
  },

  async listarLojasAtivas() {
    return listarTudo('/lojas')
  },

  async obterLoja(id) {
    try {
      return (await requisicao('GET', `/lojas/${id}`)).data
    } catch (e) {
      if (e.status === 404) return null
      throw e
    }
  },

  async obterTaxa() {
    return num((await requisicao('GET', '/configuracoes/comissao')).data.percentual_comissao)
  },

  async atualizarTaxa(percentual) {
    await requisicao('PATCH', '/admin/configuracoes/comissao', {
      corpo: { percentual_comissao: Number(percentual).toFixed(2) },
    })
  },

  // ---------- Carrinho (usuário logado) ----------
  async listarCarrinho() {
    const { data } = await requisicao('GET', '/carrinho')
    return data.map((l) => ({
      produto_id: l.produto_id,
      quantidade: l.quantidade,
      produto: normalizarProduto(l.produto),
    }))
  },

  async definirQuantidade(_clienteId, produtoId, quantidade) {
    if (quantidade <= 0) {
      await requisicao('DELETE', `/carrinho/itens/${produtoId}`)
      return
    }
    await requisicao('PUT', `/carrinho/itens/${produtoId}`, { corpo: { quantidade } })
  },

  async finalizarPedido() {
    chaveCheckout ??= uuid()
    const { data } = await requisicao('POST', '/pedidos', {
      corpo: {},
      cabecalhos: { 'Idempotency-Key': chaveCheckout },
    })
    chaveCheckout = null
    return data.id
  },

  // ---------- Pedidos ----------
  async meusPedidos() {
    const pedidos = await listarTudo('/pedidos')
    return pedidos.map(normalizarPedido)
  },

  // visao: 'cliente', 'vendedor' (só os itens da própria loja) ou 'admin'.
  async obterPedido(id) {
    try {
      const { data } = await requisicao('GET', `/pedidos/${id}`)
      return { ...normalizarPedido(data), visao: data.visao }
    } catch (e) {
      if (e.status === 404) return null
      throw e
    }
  },

  async cancelarPedido(pedidoId) {
    await requisicao('POST', `/pedidos/${pedidoId}/cancelamento`, { corpo: {} })
  },

  // ---------- Vendedor ----------
  async minhaLoja() {
    return (await requisicao('GET', '/minha-loja')).data
  },

  async criarLoja(_vendedorId, { nome, descricao }) {
    const { data } = await requisicao('POST', '/minha-loja', { corpo: { nome, descricao: descricao || null } })
    return data
  },

  // Quem edita o próprio cadastro envia o nome; a administração só liga/desliga a loja.
  async atualizarLoja(id, campos) {
    if ('nome' in campos) {
      await requisicao('PATCH', '/minha-loja', { corpo: campos })
    } else {
      await requisicao('PATCH', `/admin/lojas/${id}`, { corpo: { ativa: campos.ativa } })
    }
  },

  async produtosDaLoja() {
    const produtos = lembrarVersoes(await listarTudo('/minha-loja/produtos'))
    return produtos.map(normalizarProduto)
  },

  async salvarProduto(produto) {
    const { id, nome, descricao, preco, foto_url, estoque, ativo, versao, categoria_id } = produto
    const campos = {
      nome,
      descricao: descricao || null,
      categoria_id: categoria_id || null,
      preco: Number(preco).toFixed(2),
      estoque,
      ativo,
      ...imagemDe(foto_url),
    }
    if (id) {
      const { data } = await requisicao('PATCH', `/minha-loja/produtos/${id}`, { corpo: { ...campos, versao } })
      lembrarVersoes([data])
      return id
    }
    const { data } = await requisicao('POST', '/minha-loja/produtos', { corpo: campos })
    lembrarVersoes([data])
    return data.id
  },

  // Chamado pela administração para pausar/reativar um produto.
  async atualizarProduto(id, { ativo }) {
    if (!versoes.has(id)) lembrarVersoes([await this.obterProduto(id)])
    const { data } = await requisicao('PATCH', `/admin/produtos/${id}`, {
      corpo: { ativo, versao: versoes.get(id) },
    })
    lembrarVersoes([data])
  },

  async enviarFoto(_lojaId, arquivo) {
    const formulario = new FormData()
    formulario.append('arquivo', arquivo)
    const { data } = await requisicao('POST', '/minha-loja/imagens', { formulario })
    return data.foto_url
  },

  async vendasDaMinhaLoja() {
    const vendas = await listarTudo('/minha-loja/vendas')
    return vendas.map((v) => ({
      ...v,
      subtotal: num(v.subtotal),
      valor_comissao: num(v.valor_comissao),
      valor_vendedor: num(v.valor_vendedor),
    }))
  },

  // ---------- Administração (ISAC) ----------
  async todosPedidos() {
    const pedidos = await listarTudo('/admin/pedidos')
    return pedidos.map(normalizarPedido)
  },

  async confirmarPagamento(pedidoId) {
    await requisicao('POST', `/admin/pedidos/${pedidoId}/confirmacao`, { corpo: {} })
  },

  async todasLojas() {
    return listarTudo('/admin/lojas')
  },

  async todosProdutos() {
    const produtos = lembrarVersoes(await listarTudo('/admin/produtos'))
    return produtos.map(normalizarProduto)
  },
}
