// Modo demonstração: mesma interface do supabaseApi, mas os dados ficam no
// localStorage do navegador. Reproduz as regras do banco (comissão calculada
// na finalização, estoque reservado, cancelamento devolve estoque, permissões
// do administrador) para que o fluxo possa ser apresentado sem servidor.
import { criarBaseDemo } from './demoSeed'

const CHAVE_DB = 'isac-market-demo-db-v1'
const CHAVE_SESSAO = 'isac-market-demo-sessao'

let cache = null
const ouvintes = new Set()

function ler(chave) {
  try {
    return JSON.parse(localStorage.getItem(chave))
  } catch {
    return null
  }
}
function gravar(chave, valor) {
  try {
    if (valor === null) localStorage.removeItem(chave)
    else localStorage.setItem(chave, JSON.stringify(valor))
  } catch {
    /* navegador sem armazenamento: os dados valem só até recarregar */
  }
}

// Bases salvas no navegador antes das categorias recebem as categorias
// e a categoria dos produtos de exemplo, sem perder o resto dos dados.
function atualizarBase(base) {
  if (!base.categorias) {
    const nova = criarBaseDemo()
    base.categorias = nova.categorias
    for (const p of base.produtos) {
      if (!('categoria_id' in p)) p.categoria_id = nova.produtos.find((x) => x.id === p.id)?.categoria_id ?? null
    }
  }
  return base
}

function db() {
  if (!cache) cache = atualizarBase(ler(CHAVE_DB) || criarBaseDemo())
  return cache
}
function salvar() {
  gravar(CHAVE_DB, cache)
}

let sessaoMemoria = undefined
function sessao() {
  if (sessaoMemoria === undefined) sessaoMemoria = ler(CHAVE_SESSAO)
  return sessaoMemoria
}
function definirSessao(usuario) {
  sessaoMemoria = usuario
  gravar(CHAVE_SESSAO, usuario)
  ouvintes.forEach((cb) => cb(usuario))
}

const espera = (ms = 180) => new Promise((r) => setTimeout(r, ms))
const copia = (x) => structuredClone(x)
const agora = () => new Date().toISOString()
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random())
const centavos = (v) => Math.round(v * 100) / 100

function usuarioAtual() {
  const s = sessao()
  if (!s) throw new Error('Faca login para continuar.')
  return s
}
function ehAdmin() {
  const s = sessao()
  return Boolean(s && db().perfis.find((p) => p.id === s.id)?.administrador)
}
function lojaPorId(id) {
  return db().lojas.find((l) => l.id === id)
}
function comLoja(prod) {
  const l = lojaPorId(prod.loja_id)
  const c = db().categorias.find((x) => x.id === prod.categoria_id)
  return {
    ...copia(prod),
    loja: l ? { id: l.id, nome: l.nome, descricao: l.descricao, ativa: l.ativa } : null,
    categoria: c ? copia(c) : null,
  }
}

// Mesmas ordens do backend; o id desempata para a paginação não repetir itens.
const ORDENS = {
  recentes: (a, b) => b.criado_em.localeCompare(a.criado_em) || b.id.localeCompare(a.id),
  menor: (a, b) => a.preco - b.preco || a.id.localeCompare(b.id),
  maior: (a, b) => b.preco - a.preco || b.id.localeCompare(a.id),
  nome: (a, b) => a.nome.localeCompare(b.nome) || a.id.localeCompare(b.id),
}
function pedidoCompleto(p) {
  const base = db()
  const cliente = base.perfis.find((x) => x.id === p.cliente_id)
  return {
    ...copia(p),
    cliente: cliente ? { nome: cliente.nome, telefone: cliente.telefone } : null,
    itens: base.pedido_itens
      .filter((i) => i.pedido_id === p.id)
      .map((i) => ({ ...copia(i), loja: { id: i.loja_id, nome: lojaPorId(i.loja_id)?.nome } })),
  }
}

export const demoApi = {
  modo: 'demo',

  restaurarDemo() {
    cache = criarBaseDemo()
    salvar()
    definirSessao(null)
  },

  // ---------- Autenticação e perfil ----------
  async obterUsuario() {
    return sessao()
  },

  aoMudarAutenticacao(callback) {
    ouvintes.add(callback)
    return () => ouvintes.delete(callback)
  },

  async cadastrar({ nome, email, senha, telefone }) {
    await espera()
    const base = db()
    email = email.trim().toLowerCase()
    if (base.usuarios.some((u) => u.email === email)) throw new Error('User already registered')
    if (senha.length < 6) throw new Error('Password should be at least 6 characters')
    const id = uid()
    base.usuarios.push({ id, email, senha })
    base.perfis.push({ id, nome: nome.trim(), telefone: telefone || null, administrador: false, criado_em: agora() })
    salvar()
    definirSessao({ id, email })
    return { precisaConfirmarEmail: false }
  },

  async entrar({ email, senha }) {
    await espera()
    const u = db().usuarios.find((x) => x.email === email.trim().toLowerCase() && x.senha === senha)
    if (!u) throw new Error('Invalid login credentials')
    definirSessao({ id: u.id, email: u.email })
  },

  async sair() {
    definirSessao(null)
  },

  async obterPerfil(id) {
    const p = db().perfis.find((x) => x.id === id)
    return p ? copia(p) : null
  },

  async atualizarPerfil(id, { nome, telefone }) {
    await espera()
    const p = db().perfis.find((x) => x.id === id)
    Object.assign(p, { nome, telefone: telefone || null })
    salvar()
  },

  // ---------- Catálogo ----------
  async listarProdutos({ busca = '', lojaId = '', categoria = '', ordem = 'recentes' } = {}) {
    await espera()
    const termo = busca.trim().toLowerCase()
    return db()
      .produtos.filter((p) => p.ativo && lojaPorId(p.loja_id)?.ativa)
      .filter((p) => !termo || p.nome.toLowerCase().includes(termo))
      .filter((p) => !lojaId || p.loja_id === lojaId)
      .filter((p) => !categoria || p.categoria_id === categoria)
      .sort(ORDENS[ordem] || ORDENS.recentes)
      .map(comLoja)
  },

  async listarCategorias() {
    return copia(db().categorias)
  },

  async obterProduto(id) {
    await espera(100)
    const p = db().produtos.find((x) => x.id === id)
    if (!p) return null
    const s = sessao()
    const dono = s && lojaPorId(p.loja_id)?.vendedor_id === s.id
    const visivel = (p.ativo && lojaPorId(p.loja_id)?.ativa) || dono || ehAdmin()
    return visivel ? comLoja(p) : null
  },

  async listarLojasAtivas() {
    return db()
      .lojas.filter((l) => l.ativa)
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map(({ id, nome, descricao }) => ({ id, nome, descricao }))
  },

  async obterLoja(id) {
    await espera(100)
    const l = lojaPorId(id)
    const s = sessao()
    if (!l || !(l.ativa || l.vendedor_id === s?.id || ehAdmin())) return null
    const { vendedor_id, ...loja } = copia(l)
    return { ...loja, total_produtos: db().produtos.filter((p) => p.loja_id === id && p.ativo).length }
  },

  async obterTaxa() {
    return db().configuracoes.percentual_comissao
  },

  async atualizarTaxa(percentual) {
    await espera()
    if (!ehAdmin()) throw new Error('Somente um administrador pode alterar a taxa.')
    db().configuracoes.percentual_comissao = Number(percentual)
    salvar()
  },

  // ---------- Carrinho ----------
  async listarCarrinho(clienteId) {
    const base = db()
    return base.carrinho_itens
      .filter((c) => c.cliente_id === clienteId)
      .map((c) => ({
        produto_id: c.produto_id,
        quantidade: c.quantidade,
        produto: comLoja(base.produtos.find((p) => p.id === c.produto_id)),
      }))
  },

  async definirQuantidade(clienteId, produtoId, quantidade) {
    const base = db()
    const i = base.carrinho_itens.findIndex((c) => c.cliente_id === clienteId && c.produto_id === produtoId)
    if (quantidade <= 0) {
      if (i >= 0) base.carrinho_itens.splice(i, 1)
    } else if (i >= 0) {
      base.carrinho_itens[i].quantidade = Math.min(quantidade, 999)
    } else {
      base.carrinho_itens.push({ cliente_id: clienteId, produto_id: produtoId, quantidade, adicionado_em: agora() })
    }
    salvar()
  },

  async finalizarPedido() {
    await espera(400)
    const cliente = usuarioAtual().id
    const base = db()
    const taxa = base.configuracoes.percentual_comissao
    const linhas = base.carrinho_itens.filter((c) => c.cliente_id === cliente)
    if (!linhas.length) throw new Error('O carrinho esta vazio.')

    // Valida tudo antes de alterar (como a transação do banco).
    for (const c of linhas) {
      const p = base.produtos.find((x) => x.id === c.produto_id)
      if (!p.ativo || !lojaPorId(p.loja_id)?.ativa) throw new Error(`Produto ou loja indisponivel: ${p.nome}`)
      if (p.estoque < c.quantidade) throw new Error(`Estoque insuficiente para: ${p.nome}`)
    }

    const pedidoId = uid()
    let total = 0
    let comissao = 0
    linhas.forEach((c, n) => {
      const p = base.produtos.find((x) => x.id === c.produto_id)
      const subtotal = centavos(p.preco * c.quantidade)
      const vc = centavos((subtotal * taxa) / 100)
      base.pedido_itens.push({
        id: `${pedidoId}-${n}`,
        pedido_id: pedidoId,
        produto_id: p.id,
        loja_id: p.loja_id,
        nome_produto: p.nome,
        quantidade: c.quantidade,
        preco_unitario: p.preco,
        subtotal,
        percentual_comissao: taxa,
        valor_comissao: vc,
        valor_vendedor: centavos(subtotal - vc),
      })
      p.estoque -= c.quantidade
      total += subtotal
      comissao += vc
    })
    base.pedidos.push({
      id: pedidoId,
      cliente_id: cliente,
      status: 'pendente',
      valor_total: centavos(total),
      comissao_isac: centavos(comissao),
      valor_vendedores: centavos(total - comissao),
      criado_em: agora(),
      confirmado_em: null,
    })
    base.carrinho_itens = base.carrinho_itens.filter((c) => c.cliente_id !== cliente)
    salvar()
    return pedidoId
  },

  // ---------- Pedidos ----------
  async meusPedidos(clienteId) {
    await espera()
    return db()
      .pedidos.filter((p) => p.cliente_id === clienteId)
      .sort((a, b) => b.criado_em.localeCompare(a.criado_em))
      .map(pedidoCompleto)
  },

  // Mesmas regras do backend: vendedora vê só os itens da sua loja.
  async obterPedido(id) {
    await espera(100)
    const s = usuarioAtual()
    const base = db()
    const p = base.pedidos.find((x) => x.id === id)
    if (!p) return null
    const pedido = pedidoCompleto(p)
    if (p.cliente_id === s.id) return { ...pedido, visao: 'cliente' }
    if (ehAdmin()) return { ...pedido, visao: 'admin' }
    const loja = base.lojas.find((l) => l.vendedor_id === s.id)
    const itens = loja ? pedido.itens.filter((i) => i.loja_id === loja.id) : []
    if (!itens.length) return null
    const soma = (campo) => centavos(itens.reduce((t, i) => t + i[campo], 0))
    return {
      ...pedido,
      itens,
      valor_total: soma('subtotal'),
      comissao_isac: soma('valor_comissao'),
      valor_vendedores: soma('valor_vendedor'),
      visao: 'vendedor',
    }
  },

  async cancelarPedido(pedidoId) {
    await espera()
    const s = usuarioAtual()
    const base = db()
    const p = base.pedidos.find((x) => x.id === pedidoId)
    if (!p) throw new Error('Pedido inexistente.')
    if (p.cliente_id !== s.id && !ehAdmin()) throw new Error('Voce nao pode cancelar este pedido.')
    if (p.status !== 'pendente') throw new Error('Apenas pedidos pendentes podem ser cancelados.')
    p.status = 'cancelado'
    base.pedido_itens
      .filter((i) => i.pedido_id === pedidoId)
      .forEach((i) => {
        const prod = base.produtos.find((x) => x.id === i.produto_id)
        if (prod) prod.estoque += i.quantidade
      })
    salvar()
  },

  // ---------- Vendedor ----------
  async minhaLoja(vendedorId) {
    const l = db().lojas.find((x) => x.vendedor_id === vendedorId)
    return l ? copia(l) : null
  },

  async criarLoja(vendedorId, { nome, descricao }) {
    await espera()
    const base = db()
    if (base.lojas.some((l) => l.vendedor_id === vendedorId)) throw new Error('duplicate key lojas_vendedor_id')
    const loja = { id: uid(), vendedor_id: vendedorId, nome, descricao: descricao || null, ativa: true, criado_em: agora() }
    base.lojas.push(loja)
    salvar()
    return copia(loja)
  },

  async atualizarLoja(id, campos) {
    await espera()
    const l = lojaPorId(id)
    const s = usuarioAtual()
    if (l.vendedor_id !== s.id && !ehAdmin()) throw new Error('Sem permissao para editar esta loja.')
    Object.assign(l, campos)
    salvar()
  },

  async produtosDaLoja(lojaId) {
    await espera()
    return db()
      .produtos.filter((p) => p.loja_id === lojaId)
      .sort(ORDENS.recentes)
      .map(comLoja)
  },

  async salvarProduto(produto) {
    await espera()
    const base = db()
    const campos = {
      nome: produto.nome,
      descricao: produto.descricao || null,
      categoria_id: produto.categoria_id || null,
      preco: Number(produto.preco),
      foto_url: produto.foto_url || null,
      estoque: Number(produto.estoque),
      ativo: produto.ativo,
    }
    if (produto.id) {
      Object.assign(base.produtos.find((p) => p.id === produto.id), campos)
      salvar()
      return produto.id
    }
    const id = uid()
    base.produtos.push({ id, loja_id: produto.loja_id, criado_em: agora(), ...campos })
    salvar()
    return id
  },

  async atualizarProduto(id, campos) {
    await espera()
    Object.assign(db().produtos.find((p) => p.id === id), campos)
    salvar()
  },

  async enviarFoto(_lojaId, arquivo) {
    // No modo demonstração a foto é reduzida e guardada no próprio navegador.
    const url = URL.createObjectURL(arquivo)
    try {
      const img = await new Promise((ok, falha) => {
        const i = new Image()
        i.onload = () => ok(i)
        i.onerror = falha
        i.src = url
      })
      const lado = 640
      const escala = Math.min(1, lado / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * escala)
      canvas.height = Math.round(img.height * escala)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      return canvas.toDataURL('image/jpeg', 0.8)
    } finally {
      URL.revokeObjectURL(url)
    }
  },

  async vendasDaMinhaLoja() {
    await espera()
    const s = usuarioAtual()
    const base = db()
    const loja = base.lojas.find((l) => l.vendedor_id === s.id)
    if (!loja) return []
    return base.pedido_itens
      .filter((i) => i.loja_id === loja.id)
      .map((i) => {
        const pe = base.pedidos.find((p) => p.id === i.pedido_id)
        const cli = base.perfis.find((p) => p.id === pe.cliente_id)
        return {
          pedido_id: pe.id,
          criado_em: pe.criado_em,
          status: pe.status,
          cliente_nome: cli?.nome,
          cliente_telefone: cli?.telefone,
          produto_nome: i.nome_produto,
          quantidade: i.quantidade,
          subtotal: i.subtotal,
          valor_comissao: i.valor_comissao,
          valor_vendedor: i.valor_vendedor,
        }
      })
      .sort((a, b) => b.criado_em.localeCompare(a.criado_em))
  },

  // ---------- Administração ----------
  async todosPedidos() {
    await espera()
    if (!ehAdmin()) return []
    return [...db().pedidos].sort((a, b) => b.criado_em.localeCompare(a.criado_em)).map(pedidoCompleto)
  },

  async confirmarPagamento(pedidoId) {
    await espera(300)
    if (!ehAdmin()) throw new Error('Somente um administrador pode confirmar o pagamento.')
    const p = db().pedidos.find((x) => x.id === pedidoId)
    if (!p || p.status !== 'pendente') throw new Error('Pedido inexistente ou nao esta pendente.')
    p.status = 'confirmado'
    p.confirmado_em = agora()
    salvar()
  },

  async todasLojas() {
    await espera()
    const base = db()
    return base.lojas
      .map((l) => {
        const v = base.perfis.find((p) => p.id === l.vendedor_id)
        return {
          ...copia(l),
          vendedor: v ? { nome: v.nome, telefone: v.telefone } : null,
          total_produtos: base.produtos.filter((p) => p.loja_id === l.id).length,
        }
      })
      .sort((a, b) => a.nome.localeCompare(b.nome))
  },

  async todosProdutos() {
    await espera()
    return [...db().produtos].sort((a, b) => a.nome.localeCompare(b.nome)).map(comLoja)
  },
}
