import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../services/api'
import { mensagemDeErro } from '../lib/format'
import ProdutoCard from '../components/ProdutoCard'
import { Aviso, Botao, Carregando, Selecao, TituloPagina, Vazio } from '../components/ui'

const ORDENS = {
  recentes: ['Mais recentes', () => 0],
  menor: ['Menor preço', (a, b) => a.preco - b.preco],
  maior: ['Maior preço', (a, b) => b.preco - a.preco],
  nome: ['Nome (A–Z)', (a, b) => a.nome.localeCompare(b.nome)],
}

export default function Catalogo() {
  const [params, setParams] = useSearchParams()
  const busca = params.get('busca') || ''
  const lojaId = params.get('loja') || ''
  const ordem = params.get('ordem') || 'recentes'

  const [texto, setTexto] = useState(busca)
  const [produtos, setProdutos] = useState(null)
  const [lojas, setLojas] = useState([])
  const [erro, setErro] = useState('')

  useEffect(() => {
    api.listarLojasAtivas().then(setLojas).catch(() => {})
  }, [])

  useEffect(() => {
    let ativo = true
    setProdutos(null)
    setErro('')
    api
      .listarProdutos({ busca, lojaId })
      .then((p) => ativo && setProdutos(p))
      .catch((e) => {
        if (!ativo) return
        setErro(mensagemDeErro(e))
        setProdutos([])
      })
    return () => {
      ativo = false
    }
  }, [busca, lojaId])

  const ordenados = useMemo(() => {
    if (!produtos) return null
    const fn = ORDENS[ordem]?.[1] || ORDENS.recentes[1]
    return [...produtos].sort(fn)
  }, [produtos, ordem])

  function atualizar(chave, valor) {
    const novo = new URLSearchParams(params)
    if (valor) novo.set(chave, valor)
    else novo.delete(chave)
    setParams(novo, { replace: true })
  }

  const lojaAtual = lojas.find((l) => l.id === lojaId)
  const filtrando = busca || lojaId

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <TituloPagina titulo={lojaAtual ? lojaAtual.nome : 'Produtos'}>
        {lojaAtual?.descricao || 'Tudo o que as lojas da comunidade estão vendendo agora.'}
      </TituloPagina>

      <form
        role="search"
        className="grid gap-3 grid-cols-2 sm:grid-cols-[1fr_auto_auto] mb-10"
        onSubmit={(e) => {
          e.preventDefault()
          atualizar('busca', texto.trim())
        }}
      >
        <div className="col-span-2 sm:col-span-1 flex gap-2">
          <label htmlFor="busca" className="sr-only">
            Buscar produto
          </label>
          <input
            id="busca"
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar: bolo, bordado, mel…"
            className="w-full rounded-md border-2 border-linha bg-white px-3 py-2.5 focus:border-mar focus:outline-none"
          />
          <Botao type="submit">Buscar</Botao>
        </div>
        <div>
          <label htmlFor="loja" className="sr-only">
            Filtrar por loja
          </label>
          <Selecao id="loja" value={lojaId} onChange={(e) => atualizar('loja', e.target.value)}>
            <option value="">Todas as lojas</option>
            {lojas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </Selecao>
        </div>
        <div>
          <label htmlFor="ordem" className="sr-only">
            Ordenar
          </label>
          <Selecao id="ordem" value={ordem} onChange={(e) => atualizar('ordem', e.target.value === 'recentes' ? '' : e.target.value)}>
            {Object.entries(ORDENS).map(([id, [rotulo]]) => (
              <option key={id} value={id}>
                {rotulo}
              </option>
            ))}
          </Selecao>
        </div>
      </form>

      {erro && <Aviso tipo="erro" className="mb-6">{erro}</Aviso>}

      {ordenados === null ? (
        <Carregando texto="Buscando produtos…" />
      ) : ordenados.length === 0 ? (
        <Vazio
          titulo={filtrando ? 'Nada encontrado' : 'Nenhum produto ainda'}
          acao={
            filtrando && (
              <Botao
                variante="secundario"
                onClick={() => {
                  setTexto('')
                  setParams({}, { replace: true })
                }}
              >
                Limpar filtros
              </Botao>
            )
          }
        >
          {filtrando
            ? 'Tente outra palavra ou escolha “Todas as lojas”.'
            : 'Quando as lojas publicarem seus produtos, eles aparecem aqui.'}
        </Vazio>
      ) : (
        <>
          <p className="text-tinta-suave mb-6" aria-live="polite">
            {ordenados.length} {ordenados.length === 1 ? 'produto' : 'produtos'}
            {busca && <> para “{busca}”</>}
          </p>
          <div className="grid gap-x-4 sm:gap-x-6 gap-y-10 grid-cols-2 lg:grid-cols-4">
            {ordenados.map((p) => (
              <ProdutoCard key={p.id} produto={p} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
