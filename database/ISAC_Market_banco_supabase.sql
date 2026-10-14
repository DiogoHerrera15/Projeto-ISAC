-- ============================================================================
-- ISAC MARKET | BANCO DE DADOS DO MVP
-- Banco: PostgreSQL / Supabase
-- Uso: executar UMA VEZ no SQL Editor de um projeto Supabase novo.
-- ============================================================================

-- 1. TABELAS -----------------------------------------------------------------

create table public.perfis (
    id uuid primary key references auth.users(id) on delete cascade,
    nome text not null check (length(btrim(nome)) > 0),
    telefone text,
    administrador boolean not null default false,
    criado_em timestamptz not null default now()
);

create table public.lojas (
    id uuid primary key default gen_random_uuid(),
    vendedor_id uuid not null unique references public.perfis(id) on delete restrict,
    nome text not null check (length(btrim(nome)) > 0),
    descricao text,
    ativa boolean not null default true,
    criado_em timestamptz not null default now()
);

create table public.produtos (
    id uuid primary key default gen_random_uuid(),
    loja_id uuid not null references public.lojas(id) on delete restrict,
    nome text not null check (length(btrim(nome)) > 0),
    descricao text,
    preco numeric(12,2) not null check (preco > 0),
    foto_url text,
    estoque integer not null default 0 check (estoque >= 0),
    ativo boolean not null default true,
    criado_em timestamptz not null default now()
);

-- Nao precisamos de uma tabela 'carrinhos': cada usuario tem apenas
-- seu conjunto atual de itens, identificado por cliente_id.
create table public.carrinho_itens (
    cliente_id uuid not null references public.perfis(id) on delete cascade,
    produto_id uuid not null references public.produtos(id) on delete cascade,
    quantidade integer not null check (quantidade between 1 and 999),
    adicionado_em timestamptz not null default now(),
    primary key (cliente_id, produto_id)
);

create table public.configuracoes (
    id smallint primary key default 1 check (id = 1),
    percentual_comissao numeric(5,2) not null default 5.00
        check (percentual_comissao between 0 and 100)
);

insert into public.configuracoes (id, percentual_comissao) values (1, 5.00);

create table public.pedidos (
    id uuid primary key default gen_random_uuid(),
    cliente_id uuid not null references public.perfis(id) on delete restrict,
    status text not null default 'pendente'
        check (status in ('pendente', 'confirmado', 'cancelado')),
    valor_total numeric(12,2) not null default 0 check (valor_total >= 0),
    comissao_isac numeric(12,2) not null default 0 check (comissao_isac >= 0),
    valor_vendedores numeric(12,2) not null default 0 check (valor_vendedores >= 0),
    criado_em timestamptz not null default now(),
    confirmado_em timestamptz,
    constraint ck_pedido_total check (valor_total = comissao_isac + valor_vendedores),
    constraint ck_pedido_confirmacao check (
        (status = 'confirmado' and confirmado_em is not null)
        or (status <> 'confirmado' and confirmado_em is null)
    )
);

-- Valores ficam CONGELADOS no pedido, mesmo se o preco do produto mudar.
-- Cada item guarda tambem a loja, para atribuir a comissao ao vendedor certo.
create table public.pedido_itens (
    id uuid primary key default gen_random_uuid(),
    pedido_id uuid not null references public.pedidos(id) on delete restrict,
    produto_id uuid not null references public.produtos(id) on delete restrict,
    loja_id uuid not null references public.lojas(id) on delete restrict,
    nome_produto text not null,
    quantidade integer not null check (quantidade between 1 and 999),
    preco_unitario numeric(12,2) not null check (preco_unitario > 0),
    subtotal numeric(12,2) not null check (subtotal >= 0),
    percentual_comissao numeric(5,2) not null check (percentual_comissao between 0 and 100),
    valor_comissao numeric(12,2) not null check (valor_comissao >= 0),
    valor_vendedor numeric(12,2) not null check (valor_vendedor >= 0),
    unique (pedido_id, produto_id),
    constraint ck_item_subtotal check (subtotal = preco_unitario * quantidade),
    constraint ck_item_divisao check (subtotal = valor_comissao + valor_vendedor)
);

create index idx_produtos_loja on public.produtos (loja_id);
create index idx_produtos_ativos on public.produtos (ativo, loja_id);
create index idx_carrinho_produto on public.carrinho_itens (produto_id);
create index idx_pedidos_cliente on public.pedidos (cliente_id, criado_em desc);
create index idx_pedido_itens_pedido on public.pedido_itens (pedido_id);
create index idx_pedido_itens_loja on public.pedido_itens (loja_id);

-- 2. FUNCOES INTERNAS DE SEGURANCA -------------------------------------------
-- Funcoes privilegiadas ficam no schema PRIVATE (nao o exponha na Data API).
-- O frontend chamara apenas as funcoes PUBLIC de fachada no final do arquivo.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated;

create function private.eh_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
    select coalesce((
        select p.administrador from public.perfis p
        where p.id = (select auth.uid())
    ), false);
$$;

revoke all on function private.eh_admin() from public;
grant execute on function private.eh_admin() to anon, authenticated;

-- Criacao automatica do perfil a partir do cadastro no Supabase Auth.
create function private.criar_perfil_no_cadastro()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
    insert into public.perfis (id, nome)
    values (
        new.id,
        coalesce(
            nullif(btrim(new.raw_user_meta_data ->> 'nome'), ''),
            nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
            split_part(coalesce(new.email, 'usuario'), '@', 1)
        )
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

revoke all on function private.criar_perfil_no_cadastro() from public;

create trigger isac_criar_perfil_apos_cadastro
    after insert on auth.users
    for each row execute function private.criar_perfil_no_cadastro();

-- Inclui usuarios existentes, se Auth ja tiver cadastros antes desta instalacao.
insert into public.perfis (id, nome)
select
    u.id,
    coalesce(
        nullif(btrim(u.raw_user_meta_data ->> 'nome'), ''),
        nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
        split_part(coalesce(u.email, 'usuario'), '@', 1)
    )
from auth.users u
on conflict (id) do nothing;

-- 3. POLITICAS DE ACESSO (RLS) E PERMISSOES ----------------------------------

alter table public.perfis enable row level security;
alter table public.lojas enable row level security;
alter table public.produtos enable row level security;
alter table public.carrinho_itens enable row level security;
alter table public.configuracoes enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_itens enable row level security;

-- Remove privilegios genericos eventualmente existentes no schema PUBLIC.
revoke all on public.perfis, public.lojas, public.produtos,
    public.carrinho_itens, public.configuracoes,
    public.pedidos, public.pedido_itens
from public, anon, authenticated;

-- Perfis: cada um consulta/edita nome e telefone; admin pode consultar todos.
-- NINGUEM pode alterar 'administrador' pela API (somente SQL Editor).
grant select on public.perfis to authenticated;
grant update (nome, telefone) on public.perfis to authenticated;

create policy perfis_consultar on public.perfis
for select to authenticated
using (id = (select auth.uid()) or (select private.eh_admin()));

create policy perfis_editar on public.perfis
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- Lojas: publicas se ativas; vendedor edita apenas a sua.
grant select on public.lojas to anon, authenticated;
grant insert, update on public.lojas to authenticated;

create policy lojas_consultar on public.lojas
for select to anon, authenticated
using (
    ativa = true
    or vendedor_id = (select auth.uid())
    or (select private.eh_admin())
);

create policy lojas_criar on public.lojas
for insert to authenticated
with check (vendedor_id = (select auth.uid()));

create policy lojas_editar on public.lojas
for update to authenticated
using (
    vendedor_id = (select auth.uid())
    or (select private.eh_admin())
)
with check (
    vendedor_id = (select auth.uid())
    or (select private.eh_admin())
);

-- Produtos: catalogo publico so de lojas ativas e produtos ativos.
grant select on public.produtos to anon, authenticated;
grant insert, update on public.produtos to authenticated;

create policy produtos_consultar on public.produtos
for select to anon, authenticated
using (
    (ativo = true and exists (
        select 1 from public.lojas l where l.id = loja_id and l.ativa = true
    ))
    or exists (
        select 1 from public.lojas l
        where l.id = loja_id and l.vendedor_id = (select auth.uid())
    )
    or (select private.eh_admin())
);

create policy produtos_criar on public.produtos
for insert to authenticated
with check (
    exists (select 1 from public.lojas l
        where l.id = loja_id and l.vendedor_id = (select auth.uid()))
);

create policy produtos_editar on public.produtos
for update to authenticated
using (
    exists (select 1 from public.lojas l
        where l.id = loja_id and l.vendedor_id = (select auth.uid()))
    or (select private.eh_admin())
)
with check (
    exists (select 1 from public.lojas l
        where l.id = loja_id and l.vendedor_id = (select auth.uid()))
    or (select private.eh_admin())
);

-- Carrinho: so o dono acessa e altera seus itens.
grant select, insert, update, delete on public.carrinho_itens to authenticated;

create policy carrinho_consultar on public.carrinho_itens
for select to authenticated
using (cliente_id = (select auth.uid()));

create policy carrinho_adicionar on public.carrinho_itens
for insert to authenticated
with check (cliente_id = (select auth.uid()));

create policy carrinho_editar on public.carrinho_itens
for update to authenticated
using (cliente_id = (select auth.uid()))
with check (cliente_id = (select auth.uid()));

create policy carrinho_remover on public.carrinho_itens
for delete to authenticated
using (cliente_id = (select auth.uid()));

-- Taxa: leitura publica; alteracao so pelo administrador.
grant select on public.configuracoes to anon, authenticated;
grant update (percentual_comissao) on public.configuracoes to authenticated;

create policy configuracoes_consultar on public.configuracoes
for select to anon, authenticated using (true);

create policy configuracoes_editar on public.configuracoes
for update to authenticated
using ((select private.eh_admin()))
with check ((select private.eh_admin()));

-- Pedidos: o comprador ve seus pedidos; o admin ve todos.
-- Sem INSERT ou UPDATE direto pela API: somente funcoes seguras abaixo.
grant select on public.pedidos to authenticated;
grant select on public.pedido_itens to authenticated;

create policy pedidos_consultar on public.pedidos
for select to authenticated
using (cliente_id = (select auth.uid()) or (select private.eh_admin()));

-- Cada vendedor ve apenas os seus proprios itens de pedidos.
create policy pedido_itens_consultar on public.pedido_itens
for select to authenticated
using (
    exists (
        select 1 from public.pedidos p
        where p.id = pedido_id and p.cliente_id = (select auth.uid())
    )
    or exists (
        select 1 from public.lojas l
        where l.id = loja_id and l.vendedor_id = (select auth.uid())
    )
    or (select private.eh_admin())
);

-- 4. OPERACOES TRANSACIONAIS -------------------------------------------------
-- Ao finalizar, o banco (nao o navegador) consulta precos e calcula comissoes.
-- Estoque fica reservado no pedido pendente; cancelamento devolve o estoque.

create function private.finalizar_pedido_seguro()
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
    v_cliente uuid := (select auth.uid());
    v_pedido uuid;
    v_taxa numeric(5,2);
    v_linha record;
    v_subtotal numeric(12,2);
    v_comissao numeric(12,2);
    v_vendedor numeric(12,2);
    v_total numeric(12,2) := 0;
    v_total_comissao numeric(12,2) := 0;
    v_total_vendedores numeric(12,2) := 0;
    v_num_itens integer := 0;
begin
    if v_cliente is null then
        raise exception 'Faca login para finalizar o pedido.';
    end if;

    select percentual_comissao into v_taxa
    from public.configuracoes where id = 1;
    if not found then
        raise exception 'Taxa de comissao nao configurada.';
    end if;

    insert into public.pedidos (cliente_id)
    values (v_cliente)
    returning id into v_pedido;

    -- Locks evitam a venda simultanea de unidades acima do estoque.
    for v_linha in
        select
            c.produto_id,
            c.quantidade,
            p.loja_id,
            p.nome,
            p.preco,
            p.estoque,
            p.ativo,
            l.ativa as loja_ativa
        from public.carrinho_itens c
        join public.produtos p on p.id = c.produto_id
        join public.lojas l on l.id = p.loja_id
        where c.cliente_id = v_cliente
        order by c.produto_id
        for update of c, p
    loop
        if not v_linha.ativo or not v_linha.loja_ativa then
            raise exception 'Produto ou loja indisponivel: %', v_linha.nome;
        end if;
        if v_linha.estoque < v_linha.quantidade then
            raise exception 'Estoque insuficiente para: %', v_linha.nome;
        end if;

        v_subtotal := round(v_linha.preco * v_linha.quantidade, 2);
        v_comissao := round(v_subtotal * v_taxa / 100, 2);
        v_vendedor := v_subtotal - v_comissao;

        insert into public.pedido_itens (
            pedido_id, produto_id, loja_id, nome_produto, quantidade,
            preco_unitario, subtotal, percentual_comissao,
            valor_comissao, valor_vendedor
        ) values (
            v_pedido, v_linha.produto_id, v_linha.loja_id,
            v_linha.nome, v_linha.quantidade, v_linha.preco,
            v_subtotal, v_taxa, v_comissao, v_vendedor
        );

        update public.produtos
        set estoque = estoque - v_linha.quantidade
        where id = v_linha.produto_id;

        v_total := v_total + v_subtotal;
        v_total_comissao := v_total_comissao + v_comissao;
        v_total_vendedores := v_total_vendedores + v_vendedor;
        v_num_itens := v_num_itens + 1;
    end loop;

    if v_num_itens = 0 then
        raise exception 'O carrinho esta vazio.';
    end if;

    update public.pedidos
    set valor_total = v_total,
        comissao_isac = v_total_comissao,
        valor_vendedores = v_total_vendedores
    where id = v_pedido;

    delete from public.carrinho_itens where cliente_id = v_cliente;
    return v_pedido;
end;
$$;

create function private.confirmar_pagamento_seguro(p_pedido_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
    if not (select private.eh_admin()) then
        raise exception 'Somente um administrador pode confirmar o pagamento.';
    end if;

    update public.pedidos
    set status = 'confirmado', confirmado_em = now()
    where id = p_pedido_id and status = 'pendente';

    if not found then
        raise exception 'Pedido inexistente ou nao esta pendente.';
    end if;
end;
$$;

create function private.cancelar_pedido_seguro(p_pedido_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
    v_cliente uuid;
    v_status text;
begin
    if (select auth.uid()) is null then
        raise exception 'Faca login para cancelar o pedido.';
    end if;

    select cliente_id, status into v_cliente, v_status
    from public.pedidos where id = p_pedido_id for update;

    if not found then
        raise exception 'Pedido inexistente.';
    end if;
    if v_cliente <> (select auth.uid()) and not (select private.eh_admin()) then
        raise exception 'Voce nao pode cancelar este pedido.';
    end if;
    if v_status <> 'pendente' then
        raise exception 'Apenas pedidos pendentes podem ser cancelados.';
    end if;

    update public.pedidos set status = 'cancelado' where id = p_pedido_id;

    update public.produtos p
    set estoque = p.estoque + i.quantidade
    from public.pedido_itens i
    where i.pedido_id = p_pedido_id and i.produto_id = p.id;
end;
$$;

-- Um vendedor consulta so os itens vendidos na SUA loja, com status do pedido
-- e contato do comprador. Nao visualiza itens de outros vendedores.
create function private.pedidos_do_vendedor_seguro()
returns table (
    pedido_id uuid,
    criado_em timestamptz,
    status text,
    cliente_nome text,
    cliente_telefone text,
    produto_nome text,
    quantidade integer,
    subtotal numeric,
    valor_comissao numeric,
    valor_vendedor numeric
)
language sql stable security definer set search_path = ''
as $$
    select
        pe.id, pe.criado_em, pe.status,
        pf.nome, pf.telefone,
        i.nome_produto, i.quantidade, i.subtotal,
        i.valor_comissao, i.valor_vendedor
    from public.pedido_itens i
    join public.pedidos pe on pe.id = i.pedido_id
    join public.perfis pf on pf.id = pe.cliente_id
    join public.lojas l on l.id = i.loja_id
    where l.vendedor_id = (select auth.uid())
    order by pe.criado_em desc;
$$;

-- Torna as funcoes internas acessiveis SOMENTE via chamadas autenticadas.
revoke all on function private.finalizar_pedido_seguro() from public;
revoke all on function private.confirmar_pagamento_seguro(uuid) from public;
revoke all on function private.cancelar_pedido_seguro(uuid) from public;
revoke all on function private.pedidos_do_vendedor_seguro() from public;

grant execute on function private.finalizar_pedido_seguro() to authenticated;
grant execute on function private.confirmar_pagamento_seguro(uuid) to authenticated;
grant execute on function private.cancelar_pedido_seguro(uuid) to authenticated;
grant execute on function private.pedidos_do_vendedor_seguro() to authenticated;

-- Fachadas visiveis na API Supabase (supabase.rpc).
-- SECURITY INVOKER nas fachadas; os controles ficam nas funcoes PRIVATE.
create function public.finalizar_pedido()
returns uuid
language sql security invoker set search_path = ''
as $$ select private.finalizar_pedido_seguro(); $$;

create function public.confirmar_pagamento_simulado(p_pedido_id uuid)
returns void
language sql security invoker set search_path = ''
as $$ select private.confirmar_pagamento_seguro(p_pedido_id); $$;

create function public.cancelar_pedido(p_pedido_id uuid)
returns void
language sql security invoker set search_path = ''
as $$ select private.cancelar_pedido_seguro(p_pedido_id); $$;

create function public.pedidos_do_vendedor()
returns table (
    pedido_id uuid,
    criado_em timestamptz,
    status text,
    cliente_nome text,
    cliente_telefone text,
    produto_nome text,
    quantidade integer,
    subtotal numeric,
    valor_comissao numeric,
    valor_vendedor numeric
)
language sql stable security invoker set search_path = ''
as $$ select * from private.pedidos_do_vendedor_seguro(); $$;

revoke all on function public.finalizar_pedido() from public;
revoke all on function public.confirmar_pagamento_simulado(uuid) from public;
revoke all on function public.cancelar_pedido(uuid) from public;
revoke all on function public.pedidos_do_vendedor() from public;

grant execute on function public.finalizar_pedido() to authenticated;
grant execute on function public.confirmar_pagamento_simulado(uuid) to authenticated;
grant execute on function public.cancelar_pedido(uuid) to authenticated;
grant execute on function public.pedidos_do_vendedor() to authenticated;

-- 5. FOTOS DOS PRODUTOS - SUPABASE STORAGE ----------------------------------
-- Bucket publico so para LEITURA das imagens. O vendedor so envia arquivos
-- dentro da pasta cuja chave seja o ID da sua loja:
--        isac-produtos/<UUID-DA-LOJA>/imagem.jpg

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'isac-produtos', 'isac-produtos', true, 5242880,
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy isac_imagens_ler on storage.objects
for select to anon, authenticated
using (bucket_id = 'isac-produtos');

create policy isac_imagens_enviar on storage.objects
for insert to authenticated
with check (
    bucket_id = 'isac-produtos'
    and exists (
        select 1 from public.lojas l
        where l.id::text = (storage.foldername(name))[1]
          and l.vendedor_id = (select auth.uid())
    )
);

create policy isac_imagens_atualizar on storage.objects
for update to authenticated
using (
    bucket_id = 'isac-produtos'
    and exists (
        select 1 from public.lojas l
        where l.id::text = (storage.foldername(name))[1]
          and l.vendedor_id = (select auth.uid())
    )
)
with check (
    bucket_id = 'isac-produtos'
    and exists (
        select 1 from public.lojas l
        where l.id::text = (storage.foldername(name))[1]
          and l.vendedor_id = (select auth.uid())
    )
);

create policy isac_imagens_remover on storage.objects
for delete to authenticated
using (
    bucket_id = 'isac-produtos'
    and exists (
        select 1 from public.lojas l
        where l.id::text = (storage.foldername(name))[1]
          and l.vendedor_id = (select auth.uid())
    )
);

-- ============================================================================
-- INSTALACAO CONCLUIDA.
-- Proximos passos: criar usuarios pelo Auth, promover um administrador no
-- SQL Editor e testar uma compra. Consulte o GUIA_ISAC_Market.md.
-- ============================================================================
