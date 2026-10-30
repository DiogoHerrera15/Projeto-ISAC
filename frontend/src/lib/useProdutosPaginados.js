import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../services/api'
import { mensagemDeErro } from './format'

export const POR_PAGINA = 12

// Lista de produtos com "Carregar mais". Quando os filtros mudam, recomeça da
// primeira página; respostas de filtros antigos (busca digitada rápido) são descartadas.
export function useProdutosPaginados({ busca = '', lojaId = '', categoria = '', ordem = 'recentes' }) {
  const [produtos, setProdutos] = useState(null)
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erro, setErro] = useState('')
  const consulta = useRef(0)

  useEffect(() => {
    const atual = ++consulta.current
    setProdutos(null)
    setErro('')
    setPagina(1)
    setCarregandoMais(false)
    api
      .listarProdutosPagina({ busca, lojaId, categoria, ordem, pagina: 1, limite: POR_PAGINA })
      .then((r) => {
        if (atual !== consulta.current) return
        setProdutos(r.itens)
        setTotal(r.total)
      })
      .catch((e) => {
        if (atual !== consulta.current) return
        setErro(mensagemDeErro(e))
        setProdutos([])
        setTotal(0)
      })
  }, [busca, lojaId, categoria, ordem])

  const carregarMais = useCallback(async () => {
    const atual = consulta.current
    const proxima = pagina + 1
    setCarregandoMais(true)
    setErro('')
    try {
      const r = await api.listarProdutosPagina({ busca, lojaId, categoria, ordem, pagina: proxima, limite: POR_PAGINA })
      if (atual !== consulta.current) return
      // Se algo foi publicado entre uma página e outra, o deslocamento repete itens: filtramos pelo id.
      setProdutos((lista) => {
        const vistos = new Set(lista.map((p) => p.id))
        return [...lista, ...r.itens.filter((p) => !vistos.has(p.id))]
      })
      setTotal(r.total)
      setPagina(proxima)
    } catch (e) {
      if (atual === consulta.current) setErro(mensagemDeErro(e))
    } finally {
      if (atual === consulta.current) setCarregandoMais(false)
    }
  }, [busca, lojaId, categoria, ordem, pagina])

  const temMais = produtos !== null && produtos.length < total && pagina * POR_PAGINA < total
  return { produtos, total, temMais, carregarMais, carregandoMais, erro }
}
