import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../services/api'
import { useAuth } from './AuthContext'

// Quem ainda não entrou na conta monta o carrinho no navegador. Ao entrar,
// os itens são levados para a tabela carrinho_itens do usuário.
const CHAVE_VISITANTE = 'isac-market-carrinho-visitante'

function lerVisitante() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_VISITANTE)) || []
  } catch {
    return []
  }
}
function gravarVisitante(itens) {
  try {
    localStorage.setItem(CHAVE_VISITANTE, JSON.stringify(itens))
  } catch {
    /* sem armazenamento */
  }
}

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { usuario } = useAuth()
  const [itens, setItens] = useState(() => (usuario ? [] : lerVisitante()))
  const [carregando, setCarregando] = useState(false)
  const usuarioId = usuario?.id
  const ultimoUsuario = useRef(undefined)

  const recarregar = useCallback(async () => {
    if (!usuarioId) {
      setItens(lerVisitante())
      return
    }
    setCarregando(true)
    try {
      setItens(await api.listarCarrinho(usuarioId))
    } finally {
      setCarregando(false)
    }
  }, [usuarioId])

  useEffect(() => {
    if (ultimoUsuario.current === usuarioId) return
    ultimoUsuario.current = usuarioId
    ;(async () => {
      if (usuarioId) {
        const visitante = lerVisitante()
        if (visitante.length) {
          const atuais = await api.listarCarrinho(usuarioId)
          for (const v of visitante) {
            const existente = atuais.find((a) => a.produto_id === v.produto_id)
            await api.definirQuantidade(usuarioId, v.produto_id, (existente?.quantidade || 0) + v.quantidade)
          }
          gravarVisitante([])
        }
      }
      await recarregar()
    })().catch(() => {})
  }, [usuarioId, recarregar])

  const definirQuantidade = useCallback(
    async (produto, quantidade) => {
      const qtd = Math.max(0, Math.min(quantidade, produto.estoque ?? 999, 999))
      if (!usuarioId) {
        const anterior = lerVisitante()
        const novo = { produto_id: produto.id, quantidade: qtd, produto }
        let lista = anterior.some((i) => i.produto_id === produto.id)
          ? anterior.map((i) => (i.produto_id === produto.id ? novo : i))
          : [...anterior, novo]
        lista = lista.filter((i) => i.quantidade > 0)
        gravarVisitante(lista)
        setItens(lista)
        return
      }
      // Atualização otimista: a tela responde na hora.
      setItens((atual) => {
        const sem = atual.filter((i) => i.produto_id !== produto.id)
        if (qtd <= 0) return sem
        const existe = atual.some((i) => i.produto_id === produto.id)
        return existe
          ? atual.map((i) => (i.produto_id === produto.id ? { ...i, quantidade: qtd } : i))
          : [...atual, { produto_id: produto.id, quantidade: qtd, produto }]
      })
      try {
        await api.definirQuantidade(usuarioId, produto.id, qtd)
      } catch (e) {
        await recarregar()
        throw e
      }
    },
    [usuarioId, recarregar],
  )

  const adicionar = useCallback(
    (produto, quantidade = 1) => {
      const atual = itens.find((i) => i.produto_id === produto.id)?.quantidade || 0
      return definirQuantidade(produto, atual + quantidade)
    },
    [itens, definirQuantidade],
  )

  const resumo = useMemo(() => {
    const quantidade = itens.reduce((s, i) => s + i.quantidade, 0)
    const total = itens.reduce((s, i) => s + (i.produto?.preco || 0) * i.quantidade, 0)
    return { quantidade, total: Math.round(total * 100) / 100 }
  }, [itens])

  const valor = { itens, carregando, ...resumo, adicionar, definirQuantidade, recarregar }
  return <CartContext.Provider value={valor}>{children}</CartContext.Provider>
}

export function useCarrinho() {
  return useContext(CartContext)
}
