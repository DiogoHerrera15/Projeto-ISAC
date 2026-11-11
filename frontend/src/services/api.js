// Ponto único de acesso aos dados. O backend Node é o padrão; a demonstração
// local só é usada quando VITE_MODO=demo é escolhido explicitamente.
import { backendApi } from './backendApi'
import { demoApi } from './demoApi'

const modos = { backend: backendApi, demo: demoApi }

const pedido = import.meta.env.VITE_MODO || 'backend'
if (!Object.hasOwn(modos, pedido)) throw new Error(`VITE_MODO inválido: "${pedido}". Use backend ou demo.`)

export const modo = pedido
export const api = modos[modo]
export const modoDemo = modo === 'demo'
