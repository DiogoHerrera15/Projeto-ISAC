create table usuarios (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (length(btrim(email)) > 3 and email = lower(btrim(email))),
  senha_hash text not null,
  criado_em timestamptz not null default now()
);

create table perfis (
  id uuid primary key references usuarios(id) on delete cascade,
  nome text not null check (length(btrim(nome)) between 1 and 120),
  telefone text,
  administrador boolean not null default false,
  criado_em timestamptz not null default now()
);

create table sessoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  token_hash text not null unique,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null
);
create index sessoes_usuario_idx on sessoes(usuario_id);
create index sessoes_expira_idx on sessoes(expira_em);

create table lojas (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null unique references perfis(id) on delete restrict,
  nome text not null check (length(btrim(nome)) between 1 and 120),
  descricao text,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

create table imagens (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete restrict,
  chave_arquivo text not null unique,
  mime text not null,
  tamanho integer not null check (tamanho > 0 and tamanho <= 5242880),
  criado_em timestamptz not null default now()
);
create index imagens_loja_idx on imagens(loja_id);

create table produtos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete restrict,
  imagem_id uuid references imagens(id) on delete set null,
  nome text not null check (length(btrim(nome)) between 1 and 120),
  descricao text,
  preco numeric(12,2) not null check (preco > 0),
  foto_url text,
  estoque integer not null default 0 check (estoque >= 0),
  ativo boolean not null default true,
  versao integer not null default 1 check (versao >= 1),
  criado_em timestamptz not null default now()
);
create index produtos_loja_idx on produtos(loja_id);
create index produtos_catalogo_idx on produtos(ativo, criado_em desc, id desc);

create table carrinho_itens (
  cliente_id uuid not null references perfis(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete cascade,
  quantidade integer not null check (quantidade between 1 and 999),
  adicionado_em timestamptz not null default now(),
  primary key(cliente_id, produto_id)
);

create table configuracoes (
  id smallint primary key default 1 check (id = 1),
  percentual_comissao numeric(5,2) not null default 5.00 check (percentual_comissao between 0 and 100)
);
insert into configuracoes(id, percentual_comissao) values (1, 5.00);

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references perfis(id) on delete restrict,
  chave_checkout uuid not null,
  status text not null default 'pendente' check (status in ('pendente','confirmado','cancelado')),
  valor_total numeric(12,2) not null default 0 check (valor_total >= 0),
  comissao_isac numeric(12,2) not null default 0 check (comissao_isac >= 0),
  valor_vendedores numeric(12,2) not null default 0 check (valor_vendedores >= 0),
  criado_em timestamptz not null default now(),
  confirmado_em timestamptz,
  unique(cliente_id, chave_checkout),
  constraint pedidos_divisao check (valor_total = comissao_isac + valor_vendedores),
  constraint pedidos_confirmado check ((status = 'confirmado') = (confirmado_em is not null))
);
create index pedidos_cliente_idx on pedidos(cliente_id, criado_em desc, id desc);

create table pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete restrict,
  produto_id uuid not null references produtos(id) on delete restrict,
  loja_id uuid not null references lojas(id) on delete restrict,
  nome_produto text not null,
  quantidade integer not null check (quantidade between 1 and 999),
  preco_unitario numeric(12,2) not null check (preco_unitario > 0),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  percentual_comissao numeric(5,2) not null check (percentual_comissao between 0 and 100),
  valor_comissao numeric(12,2) not null check (valor_comissao >= 0),
  valor_vendedor numeric(12,2) not null check (valor_vendedor >= 0),
  unique(pedido_id, produto_id),
  constraint pedido_item_subtotal check (subtotal = preco_unitario * quantidade),
  constraint pedido_item_divisao check (subtotal = valor_comissao + valor_vendedor)
);
create index pedido_itens_pedido_idx on pedido_itens(pedido_id);
create index pedido_itens_loja_idx on pedido_itens(loja_id);
