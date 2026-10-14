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
- [Banco de dados](#banco-de-dados)
- [Instalação do banco no Supabase](#instalação-do-banco-no-supabase)
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
| **Acesso** | Cadastro e autenticação de usuários. |
| **Vendedores** | Cadastro de loja e gerenciamento de produtos. |
| **Catálogo** | Listagem de produtos com informações e imagens. |
| **Carrinho** | Inclusão e ajuste de quantidades de produtos. |
| **Pedidos** | Registro de pedidos e acompanhamento do status. |
| **Comissões** | Cálculo automático sobre os itens do pedido. |
| **Administração** | Consulta de pedidos, produtos e valores de comissão; confirmação simulada. |

> **Atenção ao andamento:** o banco de dados do MVP já foi preparado em SQL. As telas e a integração completa com o frontend são etapas de desenvolvimento; esta documentação não indica que todo o site já esteja concluído.

## Tecnologias

| Tecnologia | Aplicação |
|---|---|
| **React + Vite** | Interface web e funcionalidades do site. |
| **Tailwind CSS** | Estilização responsiva para computadores e celulares. |
| **Supabase** | Banco de dados PostgreSQL, autenticação e armazenamento de imagens. |
| **Vercel** | Publicação do frontend na internet para apresentação e testes. |
| **Git + GitHub** | Versionamento do projeto e colaboração entre integrantes. |

## Banco de dados

A modelagem inicial foi construída para **PostgreSQL/Supabase**, com **sete tabelas principais**:

| Tabela | Finalidade |
|---|---|
| `perfis` | Dados dos usuários e indicação de administrador. |
| `lojas` | Informações das lojas associadas aos vendedores. |
| `produtos` | Catálogo, preço, descrição, foto, estoque e disponibilidade. |
| `carrinho_itens` | Produtos e quantidades selecionados pelos clientes. |
| `pedidos` | Identificação do cliente, situação e totais de cada compra. |
| `pedido_itens` | Itens de cada pedido, com preços e comissões registrados. |
| `configuracoes` | Percentual atual de comissão do ISAC. |

O sistema também utiliza os recursos nativos do Supabase: **Authentication** para contas de usuários e **Storage** para fotos dos produtos.

### Regras importantes da modelagem

- Cada vendedor possui **uma loja** no MVP.
- Um pedido pode conter produtos de **vendedores diferentes**.
- O valor e a comissão de cada item são preservados no momento da compra, mesmo se o preço do catálogo for alterado depois.
- Os pedidos possuem os estados `pendente`, `confirmado` e `cancelado`.
- O estoque é reservado na finalização e devolvido quando um pedido pendente é cancelado.
- As permissões de acesso usam **Row Level Security (RLS)**.
- A confirmação simulada de pagamento é restrita ao administrador.

### Diagrama de relacionamentos

![Modelo de relacionamentos do banco de dados ISAC Market](database/ISAC_Market_modelo_ER.png)

> O arquivo de imagem deve estar na pasta `database/` para que o diagrama seja exibido corretamente no GitHub.

## Instalação do banco no Supabase

Para criar um banco de testes a partir do código disponibilizado:

1. Acesse [supabase.com](https://supabase.com/) e crie um projeto.
2. No painel do projeto, abra **SQL Editor → New query**.
3. Abra o arquivo [`database/ISAC_Market_banco_supabase.sql`](database/ISAC_Market_banco_supabase.sql) neste repositório.
4. Copie todo o conteúdo para o editor do Supabase e execute com **Run**.
5. Verifique a criação das **sete tabelas** em **Database → Tables**.
6. Confira no **Storage** o bucket de imagens `isac-produtos`.
7. Cadastre usuários de teste em **Authentication** e defina um administrador conforme as instruções do SQL/guia técnico.
8. Teste o fluxo de cadastro de loja, produtos, carrinho, pedido e confirmação simulada.

**Importante:** o script foi preparado para ser executado em **um projeto Supabase novo**. Não execute em um banco existente sem analisar previamente possíveis conflitos de tabelas, funções e políticas.

A descrição detalhada do processo e os exemplos de operações estão no arquivo `GUIA_ISAC_Market.md`, fornecido junto ao banco. Se for disponibilizado no repositório, mantenha-o em `database/`.

### Integração futura com React

Quando o frontend estiver criado, ele poderá utilizar a biblioteca `@supabase/supabase-js` para consultar dados e chamar as funções públicas definidas no SQL, como:

- `finalizar_pedido()` — gera o pedido a partir do carrinho do cliente autenticado.
- `cancelar_pedido()` — cancela um pedido pendente permitido e devolve seu estoque.
- `confirmar_pagamento_simulado(p_pedido_id)` — confirma um pedido, com permissão de administrador.
- `pedidos_do_vendedor()` — permite ao vendedor consultar itens vendidos pela própria loja.

As credenciais **públicas** de conexão serão configuradas no ambiente do frontend. Nunca inclua chaves secretas, senhas ou arquivos `.env` com credenciais privadas no GitHub.

## Organização do repositório

Estrutura atual e sugerida para a evolução do projeto:

```text
Projeto-ISAC/
├── database/
│   ├── ISAC_Market_banco_supabase.sql
│   ├── ISAC_Market_modelo_ER.png
│   └── GUIA_ISAC_Market.md          # documentação complementar (recomendado)
├── README.md                         # apresentação e instruções do projeto
└── ...                               # arquivos do frontend, conforme forem criados
```

A documentação do banco fica separada do código da interface para facilitar a colaboração e a manutenção.

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

- O código SQL pode ser compartilhado pelo GitHub; ele **não contém, por si só, os dados reais de uma instância Supabase**.
- O banco efetivamente utilizado pela aplicação fica hospedado no Supabase.
- Para trabalhar com os **mesmos dados**, os integrantes devem utilizar o mesmo projeto Supabase, com acessos adequados.
- Alterações importantes no banco devem ser discutidas e versionadas no repositório.
- Não publique senhas, tokens privados ou chaves `service_role` no código-fonte.

---

**ISAC Market — tecnologia, empreendedorismo local e impacto social.**

*Projeto acadêmico baseado na proposta inicial “ISAC Market — Marketplace comunitário com geração de receita para o ISAC”, sujeito à validação e a ajustes de requisitos.*
