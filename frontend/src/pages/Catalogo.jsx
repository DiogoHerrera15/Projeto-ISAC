import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../services/api'
import { mensagemDeErro } from '../lib/format'
import ProdutoCard from '../components/ProdutoCard'
import { Aviso, Botao, Carregando, Selecao, TituloPagina, Vazio } from '../components/ui'

// A ordenação é feita por quem fornece os dados (backend ou demo).
const ORDENS = {
  recentes: 'Mais recentes',
  menor: 'Menor preço',
  maior: 'Maior preço',
  nome: 'Nome (A–Z)',
}

export default function Catalogo() {
  const [params, setParams] = useSearchParams()
  const busca = params.get('busca') || ''
  const lojaId = params.get('loja') || ''
  const categoria = params.get('categoria') || ''
  const ordem = ORDENS[params.get('ordem')] ? params.get('ordem') : 'recentes'

  const [texto, setTexto] = useState(busca)
  const [produtos, setProdutos] = useState(null)
  const [lojas, setLojas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [erro, setErro] = useState('')

  useEffect(() => {
    api.listarLojasAtivas().then(setLojas).catch(() => {})
    api.listarCategorias().then(setCategorias).catch(() => {})
  }, [])

  useEffect(() => {
    let ativo = true
    setProdutos(null)
    setErro('')
    api
      .listarProdutos({ busca, lojaId, categoria, ordem })
      .then((p) => ativo && setProdutos(p))
      .catch((e) => {
        if (!ativo) return
        setErro(mensagemDeErro(e))
        setProdutos([])
      })
    return () => {
      ativo = false
    }
  }, [busca, lojaId, categoria, ordem])

  // Parte da URL do navegador, e não de `params`: a navegação do React Router
  // roda em transição e `params` pode ainda não ter a mudança anterior.
  function atualizar(chave, valor) {
    const novo = new URLSearchParams(window.location.search)
    if (valor) novo.set(chave, valor)
    else novo.delete(chave)
    setParams(novo, { replace: true })
  }

  const lojaAtual = lojas.find((l) => l.id === lojaId)
  const categoriaAtual = categorias.find((c) => c.id === categoria)
  const filtrando = busca || lojaId || categoria

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <TituloPagina titulo={lojaAtual ? lojaAtual.nome : 'Produtos'}>
        {lojaAtual?.descricao || 'Tudo o que as lojas da comunidade estão vendendo agora.'}
      </TituloPagina>

      <form
        role="search"
        className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-[1fr_auto_auto_auto] mb-10"
        onSubmit={(e) => {
          e.preventDefault()
          atualizar('busca', texto.trim())
        }}
      >
        <div className="col-span-2 sm:col-span-3 lg:col-span-1 flex gap-2">
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
        {categorias.length > 0 && (
          <div>
            <label htmlFor="categoria" className="sr-only">
              Filtrar por categoria
            </label>
            <Selecao id="categoria" value={categoria} onChange={(e) => atualizar('categoria', e.target.value)}>
              <option value="">Todas as categorias</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Selecao>
          </div>
        )}
        <div className={categorias.length > 0 ? 'col-span-2 sm:col-span-1' : ''}>
          <label htmlFor="ordem" className="sr-only">
            Ordenar
          </label>
          <Selecao id="ordem" value={ordem} onChange={(e) => atualizar('ordem', e.target.value === 'recentes' ? '' : e.target.value)}>
            {Object.entries(ORDENS).map(([id, rotulo]) => (
              <option key={id} value={id}>
                {rotulo}
              </option>
            ))}
          </Selecao>
        </div>
      </form>

      {erro && <Aviso tipo="erro" className="mb-6">{erro}</Aviso>}

      {produtos === null ? (
        <Carregando texto="Buscando produtos…" />
      ) : produtos.length === 0 ? (
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
            ? 'Tente outra palavra, outra categoria ou escolha “Todas as lojas”.'
            : 'Quando as lojas publicarem seus produtos, eles aparecem aqui.'}
        </Vazio>
      ) : (
        <>
          <p className="text-tinta-suave mb-6" aria-live="polite">
            {produtos.length} {produtos.length === 1 ? 'produto' : 'produtos'}
            {busca && <> para “{busca}”</>}
            {categoriaAtual && <> em {categoriaAtual.nome}</>}
          </p>
          <div className="grid gap-x-4 sm:gap-x-6 gap-y-10 grid-cols-2 lg:grid-cols-4">
            {produtos.map((p) => (
              <ProdutoCard key={p.id} produto={p} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
