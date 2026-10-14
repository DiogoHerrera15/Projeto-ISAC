import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [inicializado, setInicializado] = useState(false)
  const [perfilDe, setPerfilDe] = useState(null) // id do usuário cujo perfil já foi buscado

  useEffect(() => {
    let ativo = true
    api
      .obterUsuario()
      .then((u) => {
        if (ativo) setUsuario(u)
      })
      .finally(() => ativo && setInicializado(true))
    const cancelar = api.aoMudarAutenticacao((u) => setUsuario(u))
    return () => {
      ativo = false
      cancelar()
    }
  }, [])

  const recarregarPerfil = useCallback(async () => {
    if (!usuario) {
      setPerfil(null)
      setPerfilDe(null)
      return
    }
    try {
      setPerfil(await api.obterPerfil(usuario.id))
    } catch {
      setPerfil(null)
    } finally {
      setPerfilDe(usuario.id)
    }
  }, [usuario])

  useEffect(() => {
    recarregarPerfil()
  }, [recarregarPerfil])

  const carregando = !inicializado || Boolean(usuario && perfilDe !== usuario.id)

  const valor = {
    usuario,
    perfil,
    carregando,
    ehAdmin: Boolean(perfil?.administrador),
    entrar: (dados) => api.entrar(dados),
    cadastrar: (dados) => api.cadastrar(dados),
    sair: () => api.sair(),
    recarregarPerfil,
  }
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
