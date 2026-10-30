import { useState } from 'react'
import { Link } from 'react-router-dom'
import Etiqueta from './Etiqueta'
import ProdutoImagem from './ProdutoImagem'
import { useCarrinho } from '../context/CartContext'

export default function ProdutoCard({ produto }) {
  const { adicionar, itens } = useCarrinho()
  const [adicionado, setAdicionado] = useState(false)
  const noCarrinho = itens.find((i) => i.produto_id === produto.id)?.quantidade || 0
  const esgotado = produto.estoque <= 0
  const limite = noCarrinho >= produto.estoque

  async function aoAdicionar() {
    await adicionar(produto, 1)
    setAdicionado(true)
    setTimeout(() => setAdicionado(false), 1600)
  }

  return (
    <article className="group flex flex-col">
      <Link to={`/produtos/${produto.id}`} className="block relative rounded-md overflow-hidden aspect-[4/3]">
        <ProdutoImagem produto={produto} className="transition-transform duration-300 group-hover:scale-[1.03]" />
        {esgotado && (
          <span className="absolute inset-0 bg-tinta/60 flex items-center justify-center font-display text-3xl font-extrabold text-white">
            Esgotado
          </span>
        )}
      </Link>
      <div className="-mt-5 ml-3 relative z-10">
        <Etiqueta valor={produto.preco} />
      </div>
      <h3 className="mt-2 font-sans text-base sm:text-lg font-bold leading-snug">
        <Link to={`/produtos/${produto.id}`} className="hover:underline underline-offset-4">
          {produto.nome}
        </Link>
      </h3>
      <p className="text-tinta-suave text-sm">
        {produto.loja && (
          <Link to={`/lojas/${produto.loja.id}`} className="hover:text-mar hover:underline underline-offset-2">
            {produto.loja.nome}
          </Link>
        )}
        {!esgotado && produto.estoque <= 3 && (
          <span className="ml-2 font-bold text-alerta">Últimas {produto.estoque} unidades</span>
        )}
      </p>
      <div className="mt-auto pt-3">
        <button
          onClick={aoAdicionar}
          disabled={esgotado || limite}
          className="w-full rounded-md border-2 border-mar px-2 py-2 text-sm sm:text-base font-bold text-mar hover:bg-mar hover:text-white transition-colors disabled:border-linha disabled:text-tinta-suave disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
        >
          {adicionado ? (
            'Adicionado'
          ) : limite && !esgotado ? (
            'Estoque no carrinho'
          ) : (
            <>
              Adicionar<span className="hidden sm:inline"> ao carrinho</span>
            </>
          )}
        </button>
      </div>
    </article>
  )
}
