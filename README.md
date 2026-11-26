# ISAC Market

**Marketplace comunitário com geração de receita para o ISAC**

> **Status:** projeto acadêmico em desenvolvimento — primeira versão (MVP).  
> **Foco:** oferecer uma vitrine digital a pequenos vendedores da comunidade do Cabo e demonstrar um modelo de sustentabilidade financeira para o ISAC por meio de comissões sobre vendas confirmadas.

## Sumário

- [Sobre o projeto](#sobre-o-projeto)
- [Objetivos](#objetivos)
- [Como o ISAC Market funciona](#como-o-isac-market-funciona)
- [Funcionalidades previstas para o MVP](#funcionalidades-previstas-para-o-mvp)
- [Tecnologias](#tecnologias)
- [Como executar o projeto](#como-executar-o-projeto)
- [API do backend](#api-do-backend)
- [Banco de dados](#banco-de-dados)
- [Modelo legado do Supabase](#modelo-legado-do-supabase)
- [Organização do repositório](#organização-do-repositório)
- [Escopo e próximas etapas](#escopo-e-próximas-etapas)
- [Segurança e colaboração](#segurança-e-colaboração)

## Sobre o projeto

O **ISAC Market** é uma proposta de plataforma web que reúne, em um único ambiente, produtos de pequenos vendedores e empreendedores da comunidade do Cabo.

A iniciativa busca responder a duas necessidades:

1. **Visibilidade para os vendedores locais:** facilitar a divulgação de produtos, preços e informações em uma vitrine digital acessível.
2. **Possibilidade de receita para o ISAC:** demonstrar um modelo de comissão sobre vendas confirmadas que poderá contribuir para as atividades da instituição.

O projeto está sendo desenvolvido como **protótipo acadêmico**. Suas regras e funcionalidades poderão ser ajustadas após a validação dos requisitos com o professor e o ISAC.

## Objetivos

- Disponibilizar um catálogo de produtos de diferentes vendedores.
- Permitir que vendedores cadastrem e gerenciem seus produtos.
- Oferecer carrinho de compras e registro de pedidos.
- Registrar pedidos e calcular a comissão correspondente ao ISAC.
- Disponibilizar informações de pedidos, produtos e comissões para acompanhamento administrativo.
- Construir uma base simples, organizada e preparada para futuras melhorias.

## Como o ISAC Market funciona

O funcionamento proposto envolve três participantes principais:

| Participante | O que faz na plataforma |
|---|---|
| **Vendedor** | Cadastra sua loja e publica produtos com nome, descrição, preço e foto. |
| **Cliente** | Consulta o catálogo, adiciona produtos ao carrinho e registra um pedido. |
| **Administrador (ISAC)** | Acompanha produtos, pedidos e comissões; no protótipo, confirma o pagamento de forma simulada. |

**Fluxo básico:**

1. O vendedor realiza o cadastro e publica seus produtos.
2. O cliente navega pelo catálogo e adiciona itens ao carrinho.
3. Ao finalizar a compra, o sistema cria um **pedido pendente**.
4. O valor dos itens e a comissão do ISAC ficam registrados no pedido.
5. Um administrador realiza a **confirmação simulada do pagamento**.
6. O pedido confirmado passa a compor os totais do painel de vendas e comissões.

### Exemplo de comissão

Na proposta, o percentual de **5% é apenas ilustrativo** e depende de validação com os participantes. O banco fornecido utiliza inicialmente essa taxa, que pode ser alterada por um administrador.

| Descrição | Valor |
|---|---:|
| Produto vendido | R$ 50,00 |
| Comissão do ISAC (5%) | R$ 2,50 |
| Valor correspondente ao vendedor | R$ 47,50 |

*Os valores não consideram eventuais custos operacionais, taxas ou despesas adicionais. Não há transferência financeira real nesta primeira versão.*

## Funcionalidades previstas para o MVP

A primeira versão foi delimitada para ser funcional sem depender de integrações externas de pagamento ou entrega.

| Área | Funcionalidades |
|---|---|
| **Acesso** | Cadastro, autenticação, troca de senha e recuperação de senha por e-mail. |
| **Vendedores** | Cadastro de loja e gerenciamento de produtos. |
| **Catálogo** | Listagem de produtos com imagens, busca enquanto digita, filtro por loja e por categoria, ordenação por preço e "Carregar mais". |
| **Lojas** | Página pública de cada loja (`/lojas/:id`) com descrição e produtos. |
| **Carrinho** | Inclusão e ajuste de quantidades de produtos. |
| **Pedidos** | Registro de pedidos, acompanhamento do status e página de detalhe (`/pedidos/:id`) com a divisão entre loja e ISAC, para cliente, vendedora e administração. |
| **Comissões** | Cálculo automático sobre os itens do pedido. |
| **Administração** | Consulta de pedidos, produtos e valores de comissão; confirmação simulada; relatório de vendas confirmadas por período e por loja, com gráfico e exportação CSV. |

> **Atenção ao andamento:** o projeto tem hoje um **backend próprio** (API em Node.js com PostgreSQL, coberta por testes automatizados) e um **frontend em React**. O frontend foi ligado ao backend recentemente; o fluxo completo (cadastro, carrinho, pedido, confirmação) ainda está em validação. O frontend também roda sozinho em **modo demonstração**, com dados de exemplo, o que permite apresentar as telas sem servidor.

## Tecnologias

| Tecnologia | Aplicação |
|---|---|
| **React + Vite** | Interface web e funcionalidades do site. |
| **Tailwind CSS** | Estilização responsiva para computadores e celulares. |
| **Capacitor** | Empacota o frontend como aplicativo iOS (pasta `frontend/ios`). |
| **Node.js 24 + Express 5** | API do backend (`/api/v1`): autenticação por sessão, catálogo, carrinho, pedidos, comissões e administração. |
| **PostgreSQL 17** | Banco de dados do backend (migração em `backend/migrations`). |
| **SQL legado do Supabase** | Referência histórica em `database/`; não é executado pela aplicação atual. |
| **Vercel** | Publicação do frontend na internet para apresentação e testes. |
| **Git + GitHub** | Versionamento do projeto e colaboração entre integrantes. |

## Como executar o projeto

Requisitos: **Node.js 24** (backend), **Node.js 20.19 ou mais recente** (frontend) e **Docker** para o PostgreSQL local.

### Backend (API)

```bash
cd backend
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run db:seed -- --demo    # contas, lojas e produtos fictícios (senha isac1234)
npm run dev                  # API em http://localhost:3001
```

Para a recuperação de senha enviar e-mails de verdade, configure `SMTP_URL` e `MAIL_FROM` no `backend/.env` (veja `.env.example`). Sem isso, em desenvolvimento o e-mail (com o link) aparece no terminal do backend.

Contas de exemplo: `cliente@exemplo.com`, `lucia@exemplo.com` (vendedora) e `admin@isac.org` (administração).

Testes automatizados (precisam do PostgreSQL do `compose.yaml` no ar):

```bash
npm test
```

### Frontend

```bash
cd frontend
npm install
npm test
npm run dev                  # site em http://localhost:5173
```

O Vite encaminha `/api` para o backend. O backend só aceita ações de gravação (login, carrinho, pedidos) vindas do endereço exato configurado em `APP_ORIGIN` no `backend/.env` (por padrão `http://localhost:5173`); abra o site por esse mesmo endereço. Se aparecer *"Origem da requisição não permitida"*, o endereço da barra do navegador é diferente do `APP_ORIGIN`. Em ambientes remotos (como o GitHub Codespaces), use no `APP_ORIGIN` o endereço público da porta 5173; é possível listar vários endereços separados por vírgula, e o backend registra no terminal a linha `Origem recusada: ...` quando algo não bate.

> Para apresentar o projeto, veja o [roteiro de apresentação](docs/ROTEIRO_APRESENTACAO.md).

### Aplicativo para iPhone (Capacitor)

O mesmo código do site vira um aplicativo iOS (projeto em `frontend/ios`, gerado com o [Capacitor](https://capacitorjs.com)). O app guarda a sessão como um **token** no aparelho (o site continua usando cookie) e conversa com o backend pela rede.

Requisitos: Mac com **Xcode** (App Store; inclui o simulador do iPhone) e o backend rodando.

```bash
cd backend && npm run dev          # terminal 1: backend em http://localhost:3001
cd frontend
npm install
npm run app:build                  # gera o site e copia para o projeto iOS
npm run app:ios                    # abre o projeto no Xcode
```

No Xcode, escolha um iPhone no topo (por exemplo *iPhone 16*) e clique em **Run** (▶). No **simulador**, o app já fala com `http://localhost:3001` (o próprio Mac). Entre com as contas de exemplo (senha `isac1234`).

Num **iPhone de verdade**: em *Signing & Capabilities* escolha seu Apple ID (*Team*), conecte o aparelho, deixe-o na mesma rede Wi-Fi do Mac e, no app, abra **Entrar → Configurar servidor** e informe `http://IP-DO-SEU-MAC:3001` (veja o IP em *Ajustes do Sistema → Wi-Fi*). O iOS vai perguntar se o app pode usar a rede local: aceite.

Depois de mudar o código do frontend, rode `npm run app:build` de novo e execute no Xcode.

Como funciona por dentro: o app envia `X-ISAC-Client: app` e `Authorization: Bearer <token>`; o backend libera o CORS só para a origem `capacitor://localhost` (`APP_NATIVE_ORIGINS`), devolve o token no login (sem cookie) e ignora cookies nesse modo. Limitações desta versão: o token fica nas preferências do app (para publicar, trocar por armazenamento seguro/Keychain), a conexão local é HTTP (em produção use HTTPS) e o link de "esqueci minha senha" abre no navegador do aparelho.

### Modo demonstração (sem backend)

Para apresentar as telas sem subir servidor, crie `frontend/.env.local` com `VITE_MODO=demo`. Os dados de exemplo ficam salvos só no navegador (contas e regras detalhadas em `frontend/README.md`).

## API do backend

Todas as rotas ficam em `/api/v1` e respondem JSON no formato `{ "data": ... }` (ou `{ "error": { "code", "message" } }`).

| Área | Rotas principais |
|---|---|
| **Acesso** | `POST /auth/cadastro`, `POST /auth/login`, `GET /auth/sessao`, `POST /auth/logout` |
| **Senha** | `POST /auth/senha` (logado: senha atual + nova), `POST /auth/recuperacao` (envia o link por e-mail), `POST /auth/redefinicao` (token do link + nova senha) |
| **Perfil** | `GET/PATCH /perfil` |
| **Catálogo (público)** | `GET /produtos` (filtros `busca`, `lojaId`, `categoria`, `ordem`=`recentes`/`menor`/`maior`/`nome`, paginação `pagina`/`limite`), `GET /produtos/:id`, `GET /categorias`, `GET /lojas`, `GET /lojas/:id`, `GET /configuracoes/comissao` |
| **Carrinho** | `GET /carrinho`, `PUT/DELETE /carrinho/itens/:produtoId` |
| **Pedidos** | `POST /pedidos` (exige `Idempotency-Key`), `GET /pedidos`, `GET /pedidos/:id` (cliente e administração veem tudo; a vendedora vê só os itens da sua loja), `POST /pedidos/:id/cancelamento` |
| **Vendedor** | `GET/POST/PATCH /minha-loja`, `GET/POST/PATCH /minha-loja/produtos`, `POST /minha-loja/imagens`, `GET /minha-loja/vendas` |
| **Administração** | `GET /admin/pedidos`, `POST /admin/pedidos/:id/confirmacao`, `GET/PATCH /admin/lojas`, `GET/PATCH /admin/produtos`, `PATCH /admin/configuracoes/comissao`, `GET /admin/relatorios/vendas?de=AAAA-MM-DD&ate=AAAA-MM-DD&agrupar=dia\|semana\|mes` (só pedidos confirmados, pela data da confirmação no fuso de Recife) |

## Banco de dados

A modelagem inicial foi construída para **PostgreSQL/Supabase**, com **sete tabelas principais**. As migrações em `backend/migrations/` são a fonte atual do esquema PostgreSQL; elas acrescentam `usuarios`, `sessoes` e `imagens` para a autenticação e o armazenamento de fotos pelo backend Node.js:

| Tabela | Finalidade |
|---|---|
| `perfis` | Dados dos usuários e indicação de administrador. |
| `lojas` | Informações das lojas associadas aos vendedores. |
| `produtos` | Catálogo, preço, descrição, foto, estoque e disponibilidade. |
| `carrinho_itens` | Produtos e quantidades selecionados pelos clientes. |
| `pedidos` | Identificação do cliente, situação e totais de cada compra. |
| `pedido_itens` | Itens de cada pedido, com preços e comissões registrados. |
| `configuracoes` | Percentual atual de comissão do ISAC. |

O esquema histórico em `database/` usava Supabase Authentication e Storage. A aplicação atual usa sessões e armazenamento de imagens pelo backend Node.js.

A migration `backend/migrations/002_categorias.sql` acrescenta a tabela `categorias` (lista fixa, com ids legíveis como `doces` e `artesanato`) e a coluna opcional `produtos.categoria_id`. Para aplicá-la num banco já existente, rode `npm run db:migrate` de novo. O script histórico do Supabase em `database/` não inclui categorias.

### Regras importantes da modelagem

- Cada vendedor possui **uma loja** no MVP.
- Um pedido pode conter produtos de **vendedores diferentes**.
- O valor e a comissão de cada item são preservados no momento da compra, mesmo se o preço do catálogo for alterado depois.
- Os pedidos possuem os estados `pendente`, `confirmado` e `cancelado`.
- O estoque é reservado na finalização e devolvido quando um pedido pendente é cancelado.
- A API Node.js verifica autenticação, propriedade e autorização antes de acessar os dados.
- A confirmação simulada de pagamento é restrita ao administrador.

### Diagrama de relacionamentos

![Modelo de relacionamentos do banco de dados ISAC Market](database/ISAC_Market_modelo_ER.png)

> O arquivo de imagem deve estar na pasta `database/` para que o diagrama seja exibido corretamente no GitHub.

## Modelo legado do Supabase

O arquivo [`database/ISAC_Market_banco_supabase.sql`](database/ISAC_Market_banco_supabase.sql) e o diagrama ER documentam a modelagem inicial. Eles não são usados pela aplicação atual. Para iniciar ou atualizar o banco do backend Node.js, siga [Como executar o projeto](#como-executar-o-projeto) e use `backend/migrations/`. Não execute o SQL legado sobre o banco atual.

## Organização do repositório

```text
Projeto-ISAC/
├── backend/                 # API Node.js + PostgreSQL
│   ├── migrations/          # modelo do banco (SQL)
│   ├── scripts/             # migrar, popular, promover admin, limpezas
│   ├── src/                 # módulos: auth, catálogo, carrinho, pedidos, lojas, admin...
│   ├── tests/               # testes unitários e de integração
│   └── compose.yaml         # PostgreSQL local (Docker)
├── frontend/                # site em React + Vite + Tailwind
│   └── ios/                 # aplicativo iPhone (Capacitor)
│   └── src/services/        # backendApi e demoApi
├── database/                # SQL e diagrama do modelo (versão Supabase)
├── .github/workflows/       # verificação automática (CI)
└── README.md
```

Cada módulo do backend separa **rotas, controlador, serviço e repositório**, e um teste de arquitetura garante que a camada HTTP não executa SQL.

## Escopo e próximas etapas

**Primeira versão (MVP):** apresentação da plataforma, catálogo, cadastro de produtos, carrinho, registro de pedidos, confirmação de pagamento **simulada** e painel de comissões.

**Possibilidades para versões futuras:**

- Integração com meios de pagamento reais.
- Repasses automáticos aos vendedores.
- Cálculo de frete e opções de entrega.
- Integrações com serviços externos.
- Melhorias de experiência de uso, relatórios e recursos do catálogo após testes.

Essas funcionalidades futuras **não fazem parte da entrega inicial definida na proposta**.

## Segurança e colaboração

Controles já implementados no backend:

- Senhas guardadas com **scrypt** e salt individual (nunca em texto puro).
- Sessão em cookie **HttpOnly** e **SameSite**, com marca **Secure** em produção; o servidor guarda apenas o *hash* do token.
- Proteção contra requisições de outros sites (verificação de origem e cabeçalho próprio).
- Limite de tentativas nas rotas de login e cadastro.
- Validação de todas as entradas e consultas SQL parametrizadas.
- Checkout **idempotente** e com bloqueio de estoque, para evitar pedidos duplicados e vendas acima do estoque.
- Upload de fotos limitado a JPG, PNG e WebP (até 5 MB), com conferência do conteúdo real do arquivo.
- Limite de tentativas de login que só conta os erros (logins corretos não bloqueiam quem divide o mesmo IP).
- Em produção (`NODE_ENV=production`) a API também envia `Strict-Transport-Security` e uma política de conteúdo (CSP) restritiva.
- Troca de senha (encerra as outras sessões) e recuperação por link de uso único, com validade curta (1 h) e guardado só como hash; a resposta é igual para e-mails cadastrados ou não.
- Limpeza automática a cada 6 horas de sessões vencidas e fotos órfãs (também disponíveis em `npm run sessions:clean` e `npm run images:clean`).

Observações:

- Nos modos de demonstração e backend as senhas de exemplo são diferentes: `isac123` (demo, no navegador) e `isac1234` (banco local, após o seed).
- O arquivo SQL legado não contém dados reais de uma instância Supabase.
- O banco PostgreSQL efetivamente usado pela aplicação depende do ambiente configurado em `DATABASE_URL`.
- Alterações no esquema atual devem ser versionadas em `backend/migrations/`.
- Não publique senhas, tokens privados ou chaves `service_role` no código-fonte.

---

**ISAC Market — tecnologia, empreendedorismo local e impacto social.**

*Projeto acadêmico baseado na proposta inicial “ISAC Market — Marketplace comunitário com geração de receita para o ISAC”, sujeito à validação e a ajustes de requisitos.*
