import { afterEach, beforeEach, expect, test, vi } from 'vitest'

// Simula o aplicativo instalado (Capacitor/iPhone): API em endereço completo,
// sessão por token guardado no aparelho e fotos com endereço absoluto.
const responder = (status, corpo) => ({
  status,
  ok: status >= 200 && status < 300,
  json: vi.fn().mockResolvedValue(corpo),
})

const SERVIDOR = 'http://192.168.1.9:3001/api/v1'
const TOKEN = 'a'.repeat(43)
let api
let aparelho // o que o app guardou (Preferences)
let local // localStorage

beforeEach(async () => {
  vi.resetModules()
  aparelho = new Map()
  local = new Map([['isac-api-url', SERVIDOR]])
  vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
  vi.doMock('@capacitor/preferences', () => ({
    Preferences: {
      get: async ({ key }) => ({ value: aparelho.get(key) ?? null }),
      set: async ({ key, value }) => { aparelho.set(key, value) },
      remove: async ({ key }) => { aparelho.delete(key) },
    },
  }))
  vi.stubGlobal('window', { location: { origin: 'capacitor://localhost' } })
  vi.stubGlobal('localStorage', {
    getItem: (chave) => local.get(chave) ?? null,
    setItem: (chave, valor) => local.set(chave, valor),
    removeItem: (chave) => local.delete(chave),
  })
  vi.stubGlobal('fetch', vi.fn())
  api = (await import('../backendApi.js')).backendApi
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.doUnmock('@capacitor/core')
  vi.doUnmock('@capacitor/preferences')
})

test('o app chama o servidor configurado, se identifica como app e guarda o token do login', async () => {
  fetch.mockResolvedValue(responder(200, { data: { usuario: { id: 'u1', email: 'a@b.com' }, perfil: {}, token: TOKEN } }))

  await api.entrar({ email: 'a@b.com', senha: 'senha-forte-123' })

  const [url, opcoes] = fetch.mock.calls[0]
  expect(url.href).toBe(`${SERVIDOR}/auth/login`)
  expect(opcoes.headers['X-ISAC-Client']).toBe('app')
  expect(opcoes.headers.Authorization).toBeUndefined()
  expect(aparelho.get('isac-token')).toBe(TOKEN)
})

test('depois do login o token vai em Authorization e a sessão volta a existir ao reabrir o app', async () => {
  aparelho.set('isac-token', TOKEN) // o app foi fechado e aberto de novo
  fetch.mockResolvedValue(responder(200, { data: { usuario: { id: 'u1', email: 'a@b.com' } } }))

  await expect(api.obterUsuario()).resolves.toEqual({ id: 'u1', email: 'a@b.com' })
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${TOKEN}`)
})

test('sair apaga o token do aparelho, mesmo se o servidor estiver fora do ar', async () => {
  aparelho.set('isac-token', TOKEN)
  await api.obterUsuario().catch(() => {})
  fetch.mockRejectedValue(new TypeError('sem rede'))

  await expect(api.sair()).rejects.toThrow('sem rede')
  expect(aparelho.has('isac-token')).toBe(false)
})

test('sessão revogada no servidor limpa o token guardado', async () => {
  aparelho.set('isac-token', TOKEN)
  fetch
    .mockResolvedValueOnce(responder(200, { data: { usuario: { id: 'u1', email: 'a@b.com' } } }))
    .mockResolvedValueOnce(responder(401, { error: { code: 'NAO_AUTENTICADO', message: 'Entre na sua conta.' } }))
  await api.obterUsuario()
  await expect(api.obterPerfil()).rejects.toMatchObject({ status: 401 })
  expect(aparelho.has('isac-token')).toBe(false)
})

test('as fotos ganham o endereço completo do servidor (no app o relativo apontaria para dentro do app)', async () => {
  fetch.mockResolvedValue(responder(200, {
    data: [
      { id: 'p1', preco: '10.00', foto_url: '/api/v1/imagens/abc' },
      { id: 'p2', preco: '5.00', foto_url: null },
    ],
    meta: { total: 2 },
  }))
  const { itens } = await api.listarProdutosPagina()
  expect(itens[0].foto_url).toBe('http://192.168.1.9:3001/api/v1/imagens/abc')
  expect(itens[1].foto_url).toBeNull()
})
