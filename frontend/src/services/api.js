// Ponto único de acesso aos dados. As páginas importam `api` daqui e não
// precisam saber se estão falando com o Supabase ou com o modo demonstração.
import { supabaseConfigurado } from '../lib/supabase'
import { supabaseApi } from './supabaseApi'
import { demoApi } from './demoApi'

export const api = supabaseConfigurado ? supabaseApi : demoApi
export const modoDemo = !supabaseConfigurado
