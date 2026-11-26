// Onde o código está rodando e como falar com o servidor.
//   - Site (navegador): API na mesma origem (/api/v1), sessão em cookie HttpOnly.
//   - Aplicativo (Capacitor, iPhone): a página vem de dentro do app (capacitor://localhost),
//     então a API é um endereço completo (ex.: http://192.168.1.10:3001/api/v1) e a sessão
//     é um token guardado no aparelho e enviado em Authorization.
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

export const ehApp = Capacitor.isNativePlatform()

const CHAVE_SERVIDOR = 'isac-api-url'
const CHAVE_TOKEN = 'isac-token'

function lerLocal(chave) {
  try {
    return globalThis.localStorage?.getItem(chave) || ''
  } catch {
    return ''
  }
}

// No simulador do iPhone, "localhost" é o próprio Mac, onde o backend de desenvolvimento roda.
const API_PADRAO_DO_APP = 'http://localhost:3001/api/v1'

/**
 * Endereço da API: o escolhido na tela "Servidor", senão VITE_API_URL, senão o padrão
 * (no app, o backend local; no site, /api/v1 na mesma origem).
 */
export function urlDaApi() {
  const padrao = ehApp ? API_PADRAO_DO_APP : '/api/v1'
  return (lerLocal(CHAVE_SERVIDOR) || import.meta.env?.VITE_API_URL || padrao).replace(/\/$/, '')
}

/** Guarda (ou, com texto vazio, remove) o endereço da API escolhido na tela "Servidor". */
export function salvarUrlDaApi(url) {
  try {
    if (url) globalThis.localStorage.setItem(CHAVE_SERVIDOR, url)
    else globalThis.localStorage.removeItem(CHAVE_SERVIDOR)
  } catch {
    /* sem armazenamento: vale só até fechar o app */
  }
}

/** Valida e padroniza o que a pessoa digitou: http(s)://endereço[:porta][/api/v1]. */
export function normalizarUrlDaApi(texto) {
  const bruto = texto.trim()
  // Outro protocolo (ftp://, capacitor://...) não serve: o app só fala http(s) com a API.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(bruto) && !/^https?:\/\//i.test(bruto)) return null
  let url
  try {
    url = new URL(/^https?:\/\//i.test(bruto) ? bruto : `http://${bruto}`)
  } catch {
    return null
  }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) return null
  const caminho = url.pathname.replace(/\/+$/, '')
  return `${url.origin}${caminho && caminho !== '' ? caminho : '/api/v1'}`
}

/**
 * As fotos vêm como /api/v1/imagens/<id>. No site isso já funciona; no app o endereço
 * relativo apontaria para dentro do app, então vira o endereço completo do servidor.
 */
export function urlDaImagem(fotoUrl) {
  if (!fotoUrl || !fotoUrl.startsWith('/api/')) return fotoUrl
  const base = urlDaApi()
  return /^https?:\/\//.test(base) ? `${new URL(base).origin}${fotoUrl}` : fotoUrl
}

// ---------- Token de sessão do aplicativo ----------
let token = null
let carregado = false

export async function carregarToken() {
  if (!ehApp || carregado) return token
  try {
    token = (await Preferences.get({ key: CHAVE_TOKEN })).value || null
  } catch {
    token = null
  }
  carregado = true
  return token
}

export function tokenAtual() {
  return ehApp ? token : null
}

export async function guardarToken(novo) {
  if (!ehApp) return
  token = novo || null
  carregado = true
  try {
    if (token) await Preferences.set({ key: CHAVE_TOKEN, value: token })
    else await Preferences.remove({ key: CHAVE_TOKEN })
  } catch {
    /* o token fica só na memória até fechar o app */
  }
}
