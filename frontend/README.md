# ISAC Market — Frontend

Interface web do ISAC Market em **React + Vite + Tailwind CSS**. Ela pode usar duas
fontes de dados, escolhidas pela variável `VITE_MODO` (ver `.env.example`):

| `VITE_MODO` | Fonte dos dados |
|---|---|
| `backend` (padrão) | API Node do projeto (`../backend`, rotas `/api/v1`). |
| `demo` | Dados de exemplo no próprio navegador, sem servidor. |

## Como rodar

Requisitos: **Node.js 20.19 ou mais recente** (ou 22.12+).

```bash
cd frontend
npm install
npm test
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

## Telas

| Rota | Quem usa | O que faz |
|---|---|---|
| `/` | Todos | Apresentação, simulador da divisão da venda, produtos recentes, lojas, como funciona |
| `/produtos` | Todos | Catálogo com busca enquanto digita, filtro por loja e categoria, ordenação (inclusive por preço) e "Carregar mais" (12 por vez) |
| `/produtos/:id` | Todos | Detalhe do produto, categoria e escolha de quantidade |
| `/lojas/:id` | Todos | Página pública da loja: descrição e produtos (loja fechada só para a dona e a administração) |
| `/carrinho` | Todos | Carrinho agrupado por loja; finalização pela API Node.js |
| `/entrar`, `/cadastrar` | Visitantes | Login e criação de conta pela API Node.js |
| `/esqueci-senha`, `/redefinir-senha` | Visitantes | Pedido do link de recuperação e escolha da nova senha (o link vem por e-mail) |
| `/pedidos` | Cliente | Pedidos com status; cancelamento de pendentes pela API Node.js |
| `/pedidos/:id` | Cliente, vendedora, administrador | Detalhe do pedido: itens, status, datas e divisão entre loja e ISAC (a vendedora vê só os itens dela) |
| `/conta` | Logado | Nome, telefone e troca de senha (as lojas usam o telefone para combinar entrega) |
| `/minha-loja` | Vendedor | Abre a loja, cadastra produtos com foto e categoria, consulta os itens vendidos pela sua loja |
| `/servidor` | Aplicativo | Escolhe o endereço do backend (simulador: `http://localhost:3001`; iPhone: IP do Mac) |
| `/admin` | Administrador | Relatório de vendas confirmadas por período e por loja (gráfico, tabela e CSV), pedidos com confirmação simulada, lojas, produtos e taxa |

Quem não entrou na conta pode montar o carrinho; ao entrar, os itens vão para a
tabela `carrinho_itens`.

## Estrutura

```text
frontend/
├── src/
│   ├── components/   # Layout, etiqueta de preço, card de produto, UI comum
│   ├── context/      # Autenticação e carrinho
│   ├── lib/          # Formatação (moeda, datas, erros)
│   ├── pages/        # Uma página por rota
│   └── services/
│       ├── api.js          # escolhe backend ou demonstração (VITE_MODO)
│       ├── backendApi.js   # chamadas à API Node (/api/v1)
│       ├── demoApi.js      # mesma interface, dados no navegador
│       ├── relatorio.js    # relatório local do modo demonstração
│       └── demoSeed.js     # dados de exemplo
├── .env.example
└── vercel.json       # faz as rotas do React funcionarem na Vercel
```

Todas as páginas usam `api` de `services/api.js`. A integração com a API Node.js fica em `backendApi.js`; o modo demonstração é mantido em `demoApi.js`. Qualquer valor de `VITE_MODO` diferente de `backend` ou `demo` causa erro explícito.

## Aplicativo iPhone

Veja a seção "Aplicativo para iPhone (Capacitor)" do README principal. Scripts: `npm run app:build` (gera o site e sincroniza o projeto iOS) e `npm run app:ios` (abre no Xcode). O código que distingue site de app está em `src/services/ambiente.js`.

## Publicar na Vercel

1. Importe o repositório na Vercel e defina **Root Directory** = `frontend`.
2. Framework: Vite (detectado). Build: `npm run build`. Output: `dist`.
3. Para uma apresentação sem servidor, defina `VITE_MODO=demo` em **Environment Variables**. Para usar dados reais, publique a API Node.js e configure a hospedagem para encaminhar `/api/v1` na mesma origem do site, com `APP_ORIGIN` correspondente. A publicação apenas do frontend na Vercel não disponibiliza o backend.

## Identidade visual

- Cores: azul-mar `#0E4D5C` (principal), amarelo-maracujá `#F2B705` (preços e destaques).
- Fontes: Big Shoulders Display (títulos e preços) e Figtree (textos), servidas pelo próprio projeto.
- Os preços usam o formato de plaquinha de feira (`components/Etiqueta.jsx`).
- Produtos sem foto mostram um ladrilho colorido com as iniciais do nome.
