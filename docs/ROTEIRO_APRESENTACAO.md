# Roteiro de apresentação — ISAC Market

Tempo sugerido: **8 a 10 minutos**. Tudo abaixo pode ser feito no modo demonstração, sem banco de dados e sem backend.

## 1. Antes de apresentar

### Opção A — modo demonstração (recomendada, funciona em qualquer lugar)

```bash
cd frontend
echo "VITE_MODO=demo" > .env.local
npm install
npm run dev
```

Abra `http://localhost:5173`. Os dados são de exemplo e ficam só no navegador. Uma faixa amarela no topo tem o botão **Restaurar dados de exemplo** para recomeçar a demonstração.

Contas (senha `isac123`):

| Conta | Papel |
|---|---|
| `cliente@exemplo.com` | Cliente com pedidos |
| `lucia@exemplo.com` | Vendedora (Doces da Lúcia) |
| `admin@isac.org` | Administração do ISAC |

### Opção B — sistema completo (frontend + backend + PostgreSQL)

Requer Docker e Node.js 24. Funciona melhor em um computador pessoal, abrindo o site em `http://localhost:5173`.

```bash
cd backend
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run db:seed -- --demo
npm run dev
```

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Contas com senha `isac1234` (as mesmas três da tabela acima).

Em um ambiente remoto (como o GitHub Codespaces), o `APP_ORIGIN` do `backend/.env` precisa conter o endereço que aparece na barra do navegador. É possível listar mais de um, separados por vírgula:

```text
APP_ORIGIN=http://localhost:5173,https://NOME-DO-CODESPACE-5173.app.github.dev
```

Se aparecer *"Origem da requisição não permitida"*, procure no terminal do backend a linha `Origem recusada: Origin=...`. Ela mostra o endereço que chegou e os permitidos; os dois precisam ser idênticos.

## 2. Roteiro da apresentação

### 2.1 O problema e a ideia (1 min)
- Pequenos vendedores da comunidade do Cabo têm pouca visibilidade.
- O ISAC precisa de uma fonte de receita.
- Solução: uma vitrine digital em que cada **venda confirmada** destina uma comissão (5%, ajustável) ao ISAC.

### 2.2 Página inicial (1 min)
- Mostre o **simulador**: numa venda de R$ 50,00, R$ 47,50 ficam com quem vendeu e R$ 2,50 vão para o ISAC.
- Mostre "Chegou agora" e as lojas.

### 2.3 Compra como cliente (2 min) — `cliente@exemplo.com`
1. **Produtos**: busca e filtro por loja.
2. Abra um produto e mostre a divisão do valor.
3. Adicione itens de **lojas diferentes** ao carrinho (ele agrupa por loja).
4. **Finalizar pedido** (pede telefone com DDD para as lojas combinarem a entrega).
5. **Meus pedidos**: o pedido aparece como *pendente*. Mostre o cancelamento (o estoque volta).

### 2.4 Vendedora — `lucia@exemplo.com` (2 min)
- **Minha loja**: cadastro de produtos com foto, preço e estoque.
- Aba **Vendas**: pedidos recebidos com o contato do cliente e quanto ela recebe (já descontada a comissão).

### 2.5 Administração — `admin@isac.org` (2 min)
- **Pedidos**: confirme o pagamento (simulado). Nesse momento a venda passa a contar nos totais.
- Resumo de **comissões** do ISAC.
- Alterar a **taxa de comissão** e pausar lojas ou produtos.

### 2.6 Engenharia (2 min)
- **GitHub Actions** (aba *Actions* do repositório): testes do backend e build do frontend rodam a cada alteração.
- **Backend em camadas** (rotas, controlador, serviço, repositório), com um teste que impede a camada HTTP de executar SQL.
- **Regras críticas testadas**: dois clientes disputando a última unidade geram um só pedido; repetir o checkout não duplica o pedido; o valor e a comissão ficam gravados no momento da compra.
- **Segurança**: senha com scrypt, cookie HttpOnly, proteção de origem, limite de tentativas de login, upload de imagem conferido pelo conteúdo.

## 3. Perguntas prováveis

**O pagamento é real?** Não. É simulado de propósito: a confirmação é feita pela administração. Pagamento e repasse reais estão fora do escopo da primeira versão.

**Por que 5%?** É um valor ilustrativo, ajustável na administração. Precisa ser validado com o ISAC.

**Os dados de exemplo são de verdade?** Não. São fictícios (`npm run db:seed -- --demo` só funciona em banco local).

**O que impede vender mais do que o estoque?** O checkout trava os produtos durante a compra e confere o estoque. Há um teste de concorrência para isso.

**O que ainda falta?** Veja a seção abaixo.

## 4. Limitações conhecidas (diga com franqueza)

- O frontend foi ligado ao backend há pouco tempo; o fluxo completo está sendo validado em um ambiente remoto (Codespaces), onde o endereço do site precisa coincidir com o `APP_ORIGIN`.
- Não há recuperação nem troca de senha, nem confirmação de e-mail.
- As fotos ficam em disco local; em hospedagem seria preciso armazenamento externo.
- O frontend ainda não tem testes automatizados.
- O backend ainda não foi publicado em hospedagem.
