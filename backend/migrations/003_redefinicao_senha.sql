-- Pedidos de redefinição de senha ("esqueci minha senha"). O token enviado por
-- e-mail nunca é guardado: só o hash (SHA-256), como nas sessões. Cada token
-- vale uma vez (usado_em) e por pouco tempo (expira_em).
create table redefinicoes_senha (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  token_hash text not null unique,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  usado_em timestamptz
);
create index redefinicoes_senha_usuario_idx on redefinicoes_senha(usuario_id, criado_em desc);
create index redefinicoes_senha_expira_idx on redefinicoes_senha(expira_em);
