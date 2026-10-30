// Implementação da camada de dados usando o banco Supabase do projeto
// (database/ISAC_Market_banco_supabase.sql). As regras de permissão ficam no
// banco (RLS); aqui só fazemos as consultas e chamamos as funções públicas.
import { supabase } from '../lib/supabase'

const BUCKET = 'isac-produtos'

function checar({ data, error }) {
  if (error) throw error
  return data
}

const num = (v) => Number(v ?? 0)

function normalizarProduto(p) {
  if (!p) return null
  const { lojas, ...resto } = p
  return { ...resto, preco: num(p.preco), loja: lojas ?? null }
}

function normalizarPedido(p) {
  const { pedido_itens, perfis, ...resto } = p
  return {
    ...resto,
    valor_total: num(p.valor_total),
    comissao_isac: num(p.comissao_isac),
    valor_vendedores: num(p.valor_vendedores),
    cliente: perfis ?? null,
    itens: (pedido_itens ?? []).map(({ lojas, ...i }) => ({
      ...i,
      preco_unitario: num(i.preco_unitario),
      subtotal: num(i.subtotal),
      valor_comissao: num(i.valor_comissao),
      valor_vendedor: num(i.valor_vendedor),
      loja: lojas ?? null,
    })),
  }
}

const CAMPOS_PRODUTO = 'id, loja_id, nome, descricao, preco, foto_url, estoque, ativo, criado_em'

export const supabaseApi = {
  modo: 'supabase',

  // ---------- Autenticação e perfil ----------
  async obterUsuario() {
    const { data } = await supabase.auth.getSession()
    const u = data.session?.user
    return u ? { id: u.id, email: u.email } : null
  },

  aoMudarAutenticacao(callback) {
    const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      const u = sessao?.user
      callback(u ? { id: u.id, email: u.email } : null)
    })
    return () => data.subscription.unsubscribe()
  },

  async cadastrar({ nome, email, senha, telefone }) {
    const data = checar(
      await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome }, emailRedirectTo: window.location.origin },
      }),
    )
    // Se o projeto exigir confirmação de e-mail, não há sessão ainda.
    if (data.session && telefone) {
      await supabase.from('perfis').update({ telefone }).eq('id', data.user.id)
    }
    return { precisaConfirmarEmail: !data.session }
  },

  async entrar({ email, senha }) {
    checar(await supabase.auth.signInWithPassword({ email, password: senha }))
  },

  async sair() {
    checar(await supabase.auth.signOut())
  },

  async obterPerfil(id) {
    return checar(
      await supabase.from('perfis').select('id, nome, telefone, administrador').eq('id', id).maybeSingle(),
    )
  },

  async atualizarPerfil(id, { nome, telefone }) {
    checar(await supabase.from('perfis').update({ nome, telefone: telefone || null }).eq('id', id))
  },

  // ---------- Catálogo ----------
  // O banco Supabase não tem categorias: o filtro por categoria é ignorado neste modo.
  async listarProdutos({ busca = '', lojaId = '', ordem = 'recentes' } = {}) {
    const [coluna, ascending] = { menor: ['preco', true], maior: ['preco', false], nome: ['nome', true] }[ordem] || [
      'criado_em',
      false,
    ]
    let q = supabase
      .from('produtos')
      .select(`${CAMPOS_PRODUTO}, lojas!inner(id, nome, ativa)`)
      .eq('ativo', true)
      .eq('lojas.ativa', true)
      .order(coluna, { ascending })
    if (busca.trim()) q = q.ilike('nome', `%${busca.trim()}%`)
    if (lojaId) q = q.eq('loja_id', lojaId)
    return checar(await q).map(normalizarProduto)
  },

  async obterProduto(id) {
    const p = checar(
      await supabase
        .from('produtos')
        .select(`${CAMPOS_PRODUTO}, lojas(id, nome, descricao, ativa)`)
        .eq('id', id)
        .maybeSingle(),
    )
    return normalizarProduto(p)
  },

  async listarCategorias() {
    return []
  },

  async listarLojasAtivas() {
    return checar(
      await supabase.from('lojas').select('id, nome, descricao').eq('ativa', true).order('nome'),
    )
  },

  async obterTaxa() {
    const d = checar(await supabase.from('configuracoes').select('percentual_comissao').eq('id', 1).single())
    return num(d.percentual_comissao)
  },

  async atualizarTaxa(percentual) {
    checar(await supabase.from('configuracoes').update({ percentual_comissao: percentual }).eq('id', 1))
  },

  // ---------- Carrinho (usuário logado) ----------
  async listarCarrinho(clienteId) {
    const linhas = checar(
      await supabase
        .from('carrinho_itens')
        .select(`produto_id, quantidade, produtos(${CAMPOS_PRODUTO}, lojas(id, nome, ativa))`)
        .eq('cliente_id', clienteId)
        .order('adicionado_em'),
    )
    return linhas.map((l) => ({
      produto_id: l.produto_id,
      quantidade: l.quantidade,
      produto: normalizarProduto(l.produtos),
    }))
  },

  async definirQuantidade(clienteId, produtoId, quantidade) {
    if (quantidade <= 0) {
      checar(
        await supabase.from('carrinho_itens').delete().eq('cliente_id', clienteId).eq('produto_id', produtoId),
      )
      return
    }
    checar(
      await supabase
        .from('carrinho_itens')
        .upsert({ cliente_id: clienteId, produto_id: produtoId, quantidade }, { onConflict: 'cliente_id,produto_id' }),
    )
  },

  async finalizarPedido() {
    return checar(await supabase.rpc('finalizar_pedido'))
  },

  // ---------- Pedidos ----------
  async meusPedidos(clienteId) {
    const d = checar(
      await supabase
        .from('pedidos')
        .select('*, pedido_itens(*, lojas(id, nome))')
        .eq('cliente_id', clienteId)
        .order('criado_em', { ascending: false }),
    )
    return d.map(normalizarPedido)
  },

  async cancelarPedido(pedidoId) {
    checar(await supabase.rpc('cancelar_pedido', { p_pedido_id: pedidoId }))
  },

  // ---------- Vendedor ----------
  async minhaLoja(vendedorId) {
    return checar(await supabase.from('lojas').select('*').eq('vendedor_id', vendedorId).maybeSingle())
  },

  async criarLoja(vendedorId, { nome, descricao }) {
    return checar(
      await supabase.from('lojas').insert({ vendedor_id: vendedorId, nome, descricao }).select().single(),
    )
  },

  async atualizarLoja(id, campos) {
    checar(await supabase.from('lojas').update(campos).eq('id', id))
  },

  async produtosDaLoja(lojaId) {
    const d = checar(
      await supabase.from('produtos').select(CAMPOS_PRODUTO).eq('loja_id', lojaId).order('criado_em', { ascending: false }),
    )
    return d.map(normalizarProduto)
  },

  async salvarProduto(produto) {
    const { id, loja_id, nome, descricao, preco, foto_url, estoque, ativo } = produto
    const campos = { nome, descricao: descricao || null, preco, foto_url: foto_url || null, estoque, ativo }
    if (id) {
      checar(await supabase.from('produtos').update(campos).eq('id', id))
      return id
    }
    const d = checar(await supabase.from('produtos').insert({ ...campos, loja_id }).select('id').single())
    return d.id
  },

  async atualizarProduto(id, campos) {
    checar(await supabase.from('produtos').update(campos).eq('id', id))
  },

  async enviarFoto(lojaId, arquivo) {
    const ext = (arquivo.name.split('.').pop() || 'jpg').toLowerCase()
    const caminho = `${lojaId}/${crypto.randomUUID()}.${ext}`
    checar(await supabase.storage.from(BUCKET).upload(caminho, arquivo, { contentType: arquivo.type }))
    return supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl
  },

  async vendasDaMinhaLoja() {
    const d = checar(await supabase.rpc('pedidos_do_vendedor'))
    return d.map((l) => ({
      ...l,
      subtotal: num(l.subtotal),
      valor_comissao: num(l.valor_comissao),
      valor_vendedor: num(l.valor_vendedor),
    }))
  },

  // ---------- Administração (ISAC) ----------
  async todosPedidos() {
    const d = checar(
      await supabase
        .from('pedidos')
        .select('*, perfis(nome, telefone), pedido_itens(*, lojas(id, nome))')
        .order('criado_em', { ascending: false }),
    )
    return d.map(normalizarPedido)
  },

  async confirmarPagamento(pedidoId) {
    checar(await supabase.rpc('confirmar_pagamento_simulado', { p_pedido_id: pedidoId }))
  },

  async todasLojas() {
    const d = checar(
      await supabase.from('lojas').select('*, perfis(nome, telefone), produtos(id)').order('nome'),
    )
    return d.map(({ perfis, produtos, ...l }) => ({
      ...l,
      vendedor: perfis ?? null,
      total_produtos: produtos?.length ?? 0,
    }))
  },

  async todosProdutos() {
    const d = checar(
      await supabase.from('produtos').select(`${CAMPOS_PRODUTO}, lojas(id, nome, ativa)`).order('nome'),
    )
    return d.map(normalizarProduto)
  },
}
