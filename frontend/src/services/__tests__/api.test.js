import { afterEach, expect, test, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

async function carregarApi(modo) {
  vi.stubEnv('VITE_MODO', modo)
  vi.resetModules()
  return import('../api.js')
}

test('usa o backend Node quando nenhum modo é configurado', async () => {
  const { api, modo, modoDemo } = await carregarApi('')
  expect(modo).toBe('backend')
  expect(api.modo).toBe('backend')
  expect(modoDemo).toBe(false)
})

test('usa dados locais somente quando o modo demo é explícito', async () => {
  const { api, modoDemo } = await carregarApi('demo')
  expect(api.modo).toBe('demo')
  expect(modoDemo).toBe(true)
})

test('recusa o modo Supabase legado em vez de ativar demo silenciosamente', async () => {
  await expect(carregarApi('supabase')).rejects.toThrow('VITE_MODO inválido')
})
