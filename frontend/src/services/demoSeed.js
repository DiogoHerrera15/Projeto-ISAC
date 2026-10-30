// Dados de exemplo do modo demonstração. Fictícios: servem só para apresentar
// o fluxo do site sem precisar de um projeto Supabase configurado.

export const SENHA_DEMO = 'isac123'

export const CONTAS_DEMO = [
  { email: 'cliente@exemplo.com', papel: 'Cliente' },
  { email: 'lucia@exemplo.com', papel: 'Vendedora (Doces da Lúcia)' },
  { email: 'admin@isac.org', papel: 'Administração do ISAC' },
]

const dias = (n) => new Date(Date.now() - n * 86400000).toISOString()

// Mesmas categorias da migration 002 do backend.
export const CATEGORIAS_DEMO = [
  { id: 'doces', nome: 'Doces e salgados' },
  { id: 'hortifruti', nome: 'Horta e mel' },
  { id: 'artesanato', nome: 'Artesanato' },
  { id: 'moda', nome: 'Roupas e acessórios' },
  { id: 'casa', nome: 'Casa e decoração' },
  { id: 'outros', nome: 'Outros' },
]

export function criarBaseDemo() {
  const usuarios = [
    { id: 'u-admin', email: 'admin@isac.org', senha: SENHA_DEMO },
    { id: 'u-lucia', email: 'lucia@exemplo.com', senha: SENHA_DEMO },
    { id: 'u-marcos', email: 'marcos@exemplo.com', senha: SENHA_DEMO },
    { id: 'u-rita', email: 'rita@exemplo.com', senha: SENHA_DEMO },
    { id: 'u-ana', email: 'cliente@exemplo.com', senha: SENHA_DEMO },
  ]

  const perfis = [
    { id: 'u-admin', nome: 'Equipe ISAC', telefone: '(81) 3521-0000', administrador: true, criado_em: dias(60) },
    { id: 'u-lucia', nome: 'Lúcia Ferreira', telefone: '(81) 98811-2233', administrador: false, criado_em: dias(50) },
    { id: 'u-marcos', nome: 'Marcos Lima', telefone: '(81) 99702-4455', administrador: false, criado_em: dias(45) },
    { id: 'u-rita', nome: 'Rita Barbosa', telefone: '(81) 98123-6677', administrador: false, criado_em: dias(40) },
    { id: 'u-ana', nome: 'Ana Souza', telefone: '(81) 99654-8899', administrador: false, criado_em: dias(20) },
  ]

  const lojas = [
    {
      id: 'l-doces',
      vendedor_id: 'u-lucia',
      nome: 'Doces da Lúcia',
      descricao: 'Bolo de rolo, cocada e doces de tabuleiro feitos em casa, em Ponte dos Carvalhos.',
      ativa: true,
      criado_em: dias(50),
    },
    {
      id: 'l-horta',
      vendedor_id: 'u-marcos',
      nome: 'Horta do Gaibu',
      descricao: 'Verduras, temperos e mel colhidos na horta comunitária, sem agrotóxico.',
      ativa: true,
      criado_em: dias(45),
    },
    {
      id: 'l-atelie',
      vendedor_id: 'u-rita',
      nome: 'Ateliê Maré',
      descricao: 'Bordados, renda renascença e bolsas de chita costuradas à mão.',
      ativa: true,
      criado_em: dias(40),
    },
  ]

  const p = (id, loja_id, nome, preco, estoque, descricao, idade, categoria_id) => ({
    id, loja_id, categoria_id, nome, preco, estoque, descricao, foto_url: null, ativo: true, criado_em: dias(idade),
  })

  const produtos = [
    p('p-bolo-rolo', 'l-doces', 'Bolo de rolo de goiaba', 35, 8, 'Massa fininha, enrolada camada por camada com goiabada caseira. Cerca de 500 g.', 30, 'doces'),
    p('p-cocada', 'l-doces', 'Cocada de forno (6 unidades)', 18, 15, 'Cocada cremosa por dentro e dourada por cima, feita com coco fresco ralado na hora.', 28, 'doces'),
    p('p-pe-moleque', 'l-doces', 'Pé de moleque pernambucano', 22, 10, 'A receita de massa de mandioca com castanha, assada na folha de bananeira.', 25, 'doces'),
    p('p-bolo-macaxeira', 'l-doces', 'Bolo de macaxeira', 28, 6, 'Bolo úmido de macaxeira com leite de coco. Forma de 20 cm.', 12, 'doces'),
    p('p-cesta-verduras', 'l-horta', 'Cesta de verduras da semana', 30, 12, 'Alface, coentro, cebolinha, couve e o que estiver na época. Colhida no dia da entrega.', 22, 'hortifruti'),
    p('p-mel', 'l-horta', 'Mel de abelha (500 ml)', 40, 9, 'Mel puro das caixas de abelha da horta, envasado em pote de vidro.', 20, 'hortifruti'),
    p('p-mudas', 'l-horta', 'Kit de mudas de tempero', 15, 20, 'Quatro mudas em copinho: coentro, cebolinha, manjericão e hortelã.', 8, 'hortifruti'),
    p('p-pano-prato', 'l-atelie', 'Pano de prato bordado', 25, 14, 'Algodão grosso com barrado de chita e bordado de flores feito à mão.', 26, 'casa'),
    p('p-bolsa-chita', 'l-atelie', 'Bolsa de chita com forro', 60, 5, 'Bolsa de ombro em chita florida, forrada, com bolso interno e fecho de botão.', 18, 'moda'),
    p('p-toalha-renda', 'l-atelie', 'Toalha de mesa em renda renascença', 120, 2, 'Toalha de 1,40 m com acabamento em renda renascença. Peça única.', 10, 'casa'),
  ]

  // Pedidos de exemplo para o painel ter números desde o início.
  const taxa = 5
  const pedidos = []
  const pedido_itens = []
  const montarPedido = (id, status, criadoHa, itens) => {
    let total = 0
    let comissao = 0
    itens.forEach(([produtoId, qtd], i) => {
      const prod = produtos.find((x) => x.id === produtoId)
      const subtotal = prod.preco * qtd
      const vc = Math.round(subtotal * taxa) / 100
      total += subtotal
      comissao += vc
      pedido_itens.push({
        id: `${id}-i${i}`,
        pedido_id: id,
        produto_id: produtoId,
        loja_id: prod.loja_id,
        nome_produto: prod.nome,
        quantidade: qtd,
        preco_unitario: prod.preco,
        subtotal,
        percentual_comissao: taxa,
        valor_comissao: vc,
        valor_vendedor: Math.round((subtotal - vc) * 100) / 100,
      })
    })
    pedidos.push({
      id,
      cliente_id: 'u-ana',
      status,
      valor_total: total,
      comissao_isac: Math.round(comissao * 100) / 100,
      valor_vendedores: Math.round((total - comissao) * 100) / 100,
      criado_em: dias(criadoHa),
      confirmado_em: status === 'confirmado' ? dias(criadoHa - 0.2) : null,
    })
  }

  montarPedido('7f3a91c2-demo-0001', 'confirmado', 14, [['p-bolo-rolo', 2], ['p-pano-prato', 1]])
  montarPedido('b21e04d9-demo-0002', 'confirmado', 9, [['p-cesta-verduras', 1], ['p-mel', 1], ['p-cocada', 1]])
  montarPedido('c9d55e10-demo-0003', 'confirmado', 5, [['p-bolsa-chita', 1]])
  montarPedido('e4087b6f-demo-0004', 'cancelado', 4, [['p-pe-moleque', 1]])
  montarPedido('0a6c3f88-demo-0005', 'pendente', 1, [['p-bolo-macaxeira', 1], ['p-mudas', 2]])

  return {
    usuarios,
    perfis,
    lojas,
    produtos,
    categorias: CATEGORIAS_DEMO,
    carrinho_itens: [],
    pedidos,
    pedido_itens,
    configuracoes: { percentual_comissao: taxa },
  }
}
