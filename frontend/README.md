# ISAC Market — Frontend

Interface web do ISAC Market em **React + Vite + Tailwind CSS**. Ela pode usar três
fontes de dados, escolhidas pela variável `VITE_MODO` (ver `.env.example`):

| `VITE_MODO` | Fonte dos dados |
|---|---|
| `backend` (padrão) | API Node do projeto (`../backend`, rotas `/api/v1`). |
| `demo` | Dados de exemplo no próprio navegador, sem servidor. |
| `supabase` | Banco Supabase definido em `../database/ISAC_Market_banco_supabase.sql`. |

## Como rodar

Requisitos: **Node.js 20.19 ou mais recente** (ou 22.12+).

```bash
cd frontend
npm install
npm run dev
```

Abra o endereço que aparecer no terminal (normalmente http://localhost:5173).

### Rodando com o backend

Suba o backend (instruções no README principal) e rode `npm run dev` aqui. O Vite
encaminha `/api` para `http://localhost:3001`. Abra o site pelo endereço configurado em
`APP_ORIGIN` no `backend/.env` (padrão `http://localhost:5173`). Contas de exemplo do
backend: `cliente@exemplo.com`, `lucia@exemplo.com` e `admin@isac.org`, senha `isac1234`.

### Modo demonstração (sem backend)

Com `VITE_MODO=demo` no `.env.local`, o site abre em **modo demonstração**: usa dados de
exemplo salvos no próprio navegador e reproduz as regras do banco (comissão
calculada ao finalizar, estoque reservado, cancelamento devolve estoque,
confirmação só pelo administrador). Serve para apresentar e desenvolver as telas
sem depender do servidor.

Contas de exemplo (senha `isac123` para todas):

| Conta | Papel |
|---|---|
| `cliente@exemplo.com` | Cliente com pedidos |
| `lucia@exemplo.com` | Vendedora (Doces da Lúcia) |
| `admin@isac.org` | Administração do ISAC |

A faixa amarela no topo tem o botão **Restaurar dados de exemplo**.

### Conectando ao Supabase

1. Rode o SQL de `database/` num projeto Supabase novo (ver README principal).
2. Copie `.env.example` para `.env.local`, defina `VITE_MODO=supabase` e preencha com
   **Project Settings → API**: a URL do projeto e a chave pública `anon`.
3. Reinicie o `npm run dev`. O site passa a usar o banco do Supabase.
4. Para ter um administrador, crie a conta pelo site e, no SQL Editor:
   ```sql
   update public.perfis set administrador = true
   where id = (select id from auth.users where email = 'email-do-admin@exemplo.com');
   ```

> Nunca coloque a chave `service_role` no frontend nem suba o `.env.local` para o GitHub
> (ele já está no `.gitignore`).

Se o projeto Supabase exigir confirmação de e-mail, o cadastro mostra a tela
“Confira seu e-mail”. Em **Authentication → URL Configuration**, cadastre a URL
do site (local e da Vercel) para o link de confirmação funcionar.

## Telas

| Rota | Quem usa | O que faz |
|---|---|---|
| `/` | Todos | Apresentação, simulador da divisão da venda, produtos recentes, lojas, como funciona |
| `/produtos` | Todos | Catálogo com busca, filtro por loja e ordenação |
| `/produtos/:id` | Todos | Detalhe do produto e escolha de quantidade |
| `/carrinho` | Todos | Carrinho agrupado por loja; finaliza com `finalizar_pedido()` |
| `/entrar`, `/cadastrar` | Visitantes | Login e criação de conta (Supabase Auth) |
| `/pedidos` | Cliente | Pedidos com status; cancela pendentes com `cancelar_pedido()` |
| `/conta` | Logado | Nome e telefone (as lojas usam o telefone para combinar entrega) |
| `/minha-loja` | Vendedor | Abre a loja, cadastra produtos com foto (Storage), vê vendas via `pedidos_do_vendedor()` |
| `/admin` | Administrador | Resumo de comissões, pedidos com confirmação simulada, lojas, produtos e taxa |

Quem não entrou na conta pode montar o carrinho; ao entrar, os itens vão para a
tabela `carrinho_itens`.

## Estrutura

```text
frontend/
├── src/
│   ├── components/   # Layout, etiqueta de preço, card de produto, UI comum
│   ├── context/      # Autenticação e carrinho
│   ├── lib/          # Cliente Supabase e formatação (moeda, datas, erros)
│   ├── pages/        # Uma página por rota
│   └── services/
│       ├── api.js          # escolhe backend, Supabase ou demonstração (VITE_MODO)
│       ├── backendApi.js   # chamadas à API Node (/api/v1)
│       ├── supabaseApi.js  # consultas e chamadas rpc ao banco
│       ├── demoApi.js      # mesma interface, dados no navegador
│       └── demoSeed.js     # dados de exemplo
├── .env.example
└── vercel.json       # faz as rotas do React funcionarem na Vercel
```

Todas as páginas usam `api` de `services/api.js`. Para mudar uma consulta ao
banco, altere `supabaseApi.js` (e, se quiser manter a demonstração igual,
`demoApi.js`).

## Publicar na Vercel

1. Importe o repositório na Vercel e defina **Root Directory** = `frontend`.
2. Framework: Vite (detectado). Build: `npm run build`. Output: `dist`.
3. Em **Environment Variables**, escolha o modo: `VITE_MODO=demo` (apresentação, sem servidor) ou
   `VITE_MODO=supabase` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. O modo `backend` exige
   que o site e a API estejam na mesma origem, então não funciona só com a Vercel.

## Identidade visual

- Cores: azul-mar `#0E4D5C` (principal), amarelo-maracujá `#F2B705` (preços e destaques).
- Fontes: Big Shoulders Display (títulos e preços) e Figtree (textos), servidas pelo próprio projeto.
- Os preços usam o formato de plaquinha de feira (`components/Etiqueta.jsx`).
- Produtos sem foto mostram um ladrilho colorido com as iniciais do nome.
