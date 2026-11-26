import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const responder = (status, corpo) => ({
  status,
  ok: status >= 200 && status < 300,
  json: vi.fn().mockResolvedValue(corpo),
})

let api

beforeEach(async () => {
  vi.resetModules()
  vi.stubGlobal('window', { location: { origin: 'http://localhost:5173' } })
  vi.stubGlobal('fetch', vi.fn())
  api = (await import('../backendApi.js')).backendApi
})

afterEach(() => vi.unstubAllGlobals())

test('envia a sessão e os filtros ao catálogo sem expor credenciais no corpo', async () => {
  fetch.mockResolvedValue(responder(200, {
    data: [{ id: 'p1', preco: '12.50' }],
    meta: { total: 1 },
  }))

  await expect(api.listarProdutosPagina({ busca: '  bolo  ', pagina: 2 })).resolves.toEqual({
    itens: [{ id: 'p1', preco: 12.5 }], total: 1,
  })

  const [url, opcoes] = fetch.mock.calls[0]
  expect(url.pathname).toBe('/api/v1/produtos')
  expect(url.searchParams.get('busca')).toBe('bolo')
  expect(url.searchParams.get('pagina')).toBe('2')
  expect(opcoes).toMatchObject({ method: 'GET', credentials: 'same-origin' })
  expect(opcoes.headers['X-ISAC-Client']).toBe('web')
  expect(opcoes.body).toBeUndefined()
})

test('reutiliza a chave idempotente quando a resposta do checkout se perde', async () => {
  fetch
    .mockRejectedValueOnce(new TypeError('rede indisponível'))
    .mockResolvedValueOnce(responder(200, { data: { id: 'pedido-1' } }))
    .mockResolvedValueOnce(responder(200, { data: { id: 'pedido-2' } }))

  await expect(api.finalizarPedido()).rejects.toThrow('rede indisponível')
  await expect(api.finalizarPedido()).resolves.toBe('pedido-1')
  await expect(api.finalizarPedido()).resolves.toBe('pedido-2')

  const chaves = fetch.mock.calls.map(([, opcoes]) => opcoes.headers['Idempotency-Key'])
  expect(chaves[0]).toMatch(/^[0-9a-f-]{36}$/i)
  expect(chaves[1]).toBe(chaves[0])
  expect(chaves[2]).not.toBe(chaves[0])
})

test('informa a interface quando o servidor revoga a sessão', async () => {
  fetch
    .mockResolvedValueOnce(responder(200, { data: { usuario: { id: 'u1', email: 'a@b.com' } } }))
    .mockResolvedValueOnce(responder(401, { error: { code: 'NAO_AUTENTICADO', message: 'Sessão expirada' } }))
  const ouvinte = vi.fn()
  const removerOuvinte = api.aoMudarAutenticacao(ouvinte)

  await api.obterUsuario()
  await expect(api.obterPerfil()).rejects.toMatchObject({
    status: 401, codigo: 'NAO_AUTENTICADO', message: 'Sessão expirada',
  })
  expect(ouvinte).toHaveBeenCalledExactlyOnceWith(null)
  removerOuvinte()
})

test('troca e recuperação de senha chamam as rotas certas com corpo JSON', async () => {
  fetch
    .mockResolvedValueOnce(responder(204, null))
    .mockResolvedValueOnce(responder(200, { data: { enviado: true } }))
    .mockResolvedValueOnce(responder(204, null))
    .mockResolvedValueOnce(responder(400, { error: { code: 'TOKEN_INVALIDO', message: 'Este link é inválido ou expirou.' } }))

  await expect(api.alterarSenha({ senhaAtual: 'antiga-123', novaSenha: 'nova-senha-456' })).resolves.toBeUndefined()
  await expect(api.solicitarRecuperacao('ana@exemplo.com')).resolves.toEqual({})
  await expect(api.redefinirSenha({ token: 'abc', novaSenha: 'nova-senha-456' })).resolves.toBeUndefined()
  await expect(api.redefinirSenha({ token: 'velho', novaSenha: 'nova-senha-456' })).rejects.toMatchObject({
    status: 400, codigo: 'TOKEN_INVALIDO',
  })

  const chamadas = fetch.mock.calls.map(([url, opcoes]) => [url.pathname, opcoes.method, JSON.parse(opcoes.body)])
  expect(chamadas).toEqual([
    ['/api/v1/auth/senha', 'POST', { senhaAtual: 'antiga-123', novaSenha: 'nova-senha-456' }],
    ['/api/v1/auth/recuperacao', 'POST', { email: 'ana@exemplo.com' }],
    ['/api/v1/auth/redefinicao', 'POST', { token: 'abc', novaSenha: 'nova-senha-456' }],
    ['/api/v1/auth/redefinicao', 'POST', { token: 'velho', novaSenha: 'nova-senha-456' }],
  ])
  expect(fetch.mock.calls[0][1].headers['X-ISAC-Client']).toBe('web')
})

test('converte valores monetários do relatório administrativo para as telas', async () => {
  fetch.mockResolvedValue(responder(200, { data: {
    de: '2026-11-01', ate: '2026-11-30', agrupar: 'mes',
    totais: { pedidos: 1, valor_total: '50.00', comissao_isac: '2.50', valor_vendedores: '47.50' },
    por_periodo: [{ inicio: '2026-11-01', valor_total: '50.00', comissao_isac: '2.50', valor_vendedores: '47.50' }],
    por_loja: [{ loja_id: 'loja-1', valor_total: '50.00', comissao_isac: '2.50', valor_vendedores: '47.50' }],
  } }))

  const relatorio = await api.relatorioVendas({ de: '2026-11-01', ate: '2026-11-30', agrupar: 'mes' })
  expect(relatorio.totais.comissao_isac).toBe(2.5)
  expect(relatorio.por_periodo[0].valor_vendedores).toBe(47.5)
  expect(relatorio.por_loja[0].valor_total).toBe(50)
  const [url] = fetch.mock.calls[0]
  expect(url.searchParams.get('agrupar')).toBe('mes')
})
