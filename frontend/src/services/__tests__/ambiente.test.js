import { afterEach, beforeEach, expect, test, vi } from 'vitest'

let ambiente
let local

beforeEach(async () => {
  vi.resetModules()
  local = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (chave) => local.get(chave) ?? null,
    setItem: (chave, valor) => local.set(chave, valor),
    removeItem: (chave) => local.delete(chave),
  })
  ambiente = await import('../ambiente.js')
})

afterEach(() => vi.unstubAllGlobals())

test('no navegador (fora do app) a API é a do próprio site e não há token', async () => {
  expect(ambiente.ehApp).toBe(false)
  expect(ambiente.urlDaApi()).toBe('/api/v1')
  expect(ambiente.tokenAtual()).toBeNull()
  await ambiente.guardarToken('x'.repeat(43))
  expect(ambiente.tokenAtual()).toBeNull() // no site a sessão é cookie, nunca token
})

test('o endereço do servidor escolhido tem prioridade e pode ser removido', () => {
  ambiente.salvarUrlDaApi('http://192.168.1.9:3001/api/v1/')
  expect(ambiente.urlDaApi()).toBe('http://192.168.1.9:3001/api/v1')
  ambiente.salvarUrlDaApi('')
  expect(ambiente.urlDaApi()).toBe('/api/v1')
})

test('normalizarUrlDaApi completa o que a pessoa digitou', () => {
  const n = ambiente.normalizarUrlDaApi
  expect(n('192.168.1.9:3001')).toBe('http://192.168.1.9:3001/api/v1')
  expect(n('http://localhost:3001')).toBe('http://localhost:3001/api/v1')
  expect(n(' https://api.exemplo.com/ ')).toBe('https://api.exemplo.com/api/v1')
  expect(n('http://localhost:3001/api/v1/')).toBe('http://localhost:3001/api/v1')
  expect(n('')).toBeNull()
  expect(n('ftp://servidor')).toBeNull()
})

test('urlDaImagem só mexe nas fotos do servidor quando a API tem endereço completo', () => {
  expect(ambiente.urlDaImagem('/api/v1/imagens/abc')).toBe('/api/v1/imagens/abc') // site: relativo
  ambiente.salvarUrlDaApi('http://192.168.1.9:3001/api/v1')
  expect(ambiente.urlDaImagem('/api/v1/imagens/abc')).toBe('http://192.168.1.9:3001/api/v1/imagens/abc')
  expect(ambiente.urlDaImagem('https://outro.site/foto.png')).toBe('https://outro.site/foto.png')
  expect(ambiente.urlDaImagem(null)).toBeNull()
})
