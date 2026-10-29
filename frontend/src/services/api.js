// Ponto único de acesso aos dados. As páginas importam `api` daqui e não
// precisam saber se estão falando com o backend, com o Supabase ou com o modo
// demonstração. O modo vem de VITE_MODO (backend, supabase ou demo); sem ele,
// o site usa o backend.
import { supabaseConfigurado } from '../lib/supabase'
import { backendApi } from './backendApi'
import { supabaseApi } from './supabaseApi'
import { demoApi } from './demoApi'

const modos = { backend: backendApi, supabase: supabaseApi, demo: demoApi }

const pedido = import.meta.env.VITE_MODO || 'backend'
if (!(pedido in modos)) throw new Error(`VITE_MODO inválido: "${pedido}". Use backend, supabase ou demo.`)

// O modo Supabase sem as chaves configuradas cai na demonstração, como antes.
export const modo = pedido === 'supabase' && !supabaseConfigurado ? 'demo' : pedido
export const api = modos[modo]
export const modoDemo = modo === 'demo'
