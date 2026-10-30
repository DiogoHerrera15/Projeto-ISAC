-- Categorias fixas, mantidas pela equipe do ISAC. O id é legível porque
-- aparece na URL do catálogo (/produtos?categoria=doces).
create table categorias (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(id) <= 40),
  nome text not null unique check (length(btrim(nome)) between 1 and 60),
  ordem smallint not null default 0
);

insert into categorias(id, nome, ordem) values
  ('doces', 'Doces e salgados', 1),
  ('hortifruti', 'Horta e mel', 2),
  ('artesanato', 'Artesanato', 3),
  ('moda', 'Roupas e acessórios', 4),
  ('casa', 'Casa e decoração', 5),
  ('outros', 'Outros', 6);

-- Opcional: produtos cadastrados antes desta migration ficam sem categoria.
alter table produtos add column categoria_id text references categorias(id) on delete restrict;
create index produtos_categoria_idx on produtos(categoria_id);
create index produtos_preco_idx on produtos(preco, id);
