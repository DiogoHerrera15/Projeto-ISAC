import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY

// Sem as variáveis de ambiente, o site usa o modo demonstração (dados no navegador).
export const supabaseConfigurado = Boolean(url && chave && !url.includes('SEU-PROJETO'))

export const supabase = supabaseConfigurado ? createClient(url, chave) : null
