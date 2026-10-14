import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCarrinho } from '../context/CartContext'
import { api, modoDemo } from '../services/api'

function Marca() {
  return (
    <Link to="/" className="flex items-baseline gap-1.5 shrink-0" aria-label="ISAC Market, página inicial">
      <span className="font-display text-3xl font-black tracking-tight text-white">ISAC</span>
      <span className="etiqueta etiqueta-sobre-mar text-lg">Market</span>
    </Link>
  )
}

const classeNav = ({ isActive }) =>
  `px-3 py-2 rounded-md font-bold transition-colors ${
    isActive ? 'bg-white/15 text-white' : 'text-white/85 hover:text-white hover:bg-white/10'
  }`

function FaixaDemo() {
  return (
    <div className="bg-maracuja-claro text-tinta text-sm">
      <div className="mx-auto max-w-6xl px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          <strong>Modo demonstração.</strong> Os dados são de exemplo e ficam salvos só neste navegador. Para usar o banco
          real, configure o Supabase no arquivo <code>.env.local</code>.
        </span>
        <button
          className="underline underline-offset-2 font-bold cursor-pointer"
          onClick={() => {
            api.restaurarDemo()
            window.location.assign('/')
          }}
        >
          Restaurar dados de exemplo
        </button>
      </div>
    </div>
  )
}

function Cabecalho() {
  const { usuario, perfil, ehAdmin, sair } = useAuth()
  const { quantidade } = useCarrinho()
  const [menuAberto, setMenuAberto] = useState(false)
  const navegar = useNavigate()
  const local = useLocation()

  useEffect(() => setMenuAberto(false), [local.pathname])

  async function aoSair() {
    await sair()
    navegar('/')
  }

  const links = (
    <>
      <NavLink to="/produtos" className={classeNav}>
        Produtos
      </NavLink>
      {usuario && (
        <NavLink to="/pedidos" className={classeNav}>
          Meus pedidos
        </NavLink>
      )}
      <NavLink to="/minha-loja" className={classeNav}>
        {usuario ? 'Minha loja' : 'Quero vender'}
      </NavLink>
      {ehAdmin && (
        <NavLink to="/admin" className={classeNav}>
          Painel ISAC
        </NavLink>
      )}
    </>
  )

  return (
    <header className="bg-mar text-white sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center gap-4">
        <Marca />
        <nav className="hidden md:flex items-center gap-1 ml-4" aria-label="Principal">
          {links}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/carrinho"
            className="relative flex items-center gap-2 rounded-md px-3 py-2 font-bold hover:bg-white/10"
            aria-label={`Carrinho, ${quantidade} ${quantidade === 1 ? 'item' : 'itens'}`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="20.5" r="1.3" />
              <circle cx="17" cy="20.5" r="1.3" />
            </svg>
            <span className="hidden sm:inline">Carrinho</span>
            {quantidade > 0 && (
              <span className="min-w-6 h-6 rounded-full bg-maracuja text-tinta text-sm font-black flex items-center justify-center px-1.5">
                {quantidade}
              </span>
            )}
          </Link>
          {usuario ? (
            <div className="hidden md:flex items-center gap-1">
              <Link to="/conta" className="px-3 py-2 rounded-md hover:bg-white/10 max-w-44 truncate">
                {perfil?.nome?.split(' ')[0] || 'Minha conta'}
              </Link>
              <button onClick={aoSair} className="px-3 py-2 rounded-md text-white/80 hover:text-white hover:bg-white/10 cursor-pointer">
                Sair
              </button>
            </div>
          ) : (
            <Link to="/entrar" className="hidden md:inline-flex rounded-md bg-white text-mar font-bold px-4 py-2 hover:bg-mar-claro">
              Entrar
            </Link>
          )}
          <button
            className="md:hidden rounded-md p-2 hover:bg-white/10 cursor-pointer"
            aria-expanded={menuAberto}
            aria-controls="menu-movel"
            aria-label="Abrir menu"
            onClick={() => setMenuAberto((v) => !v)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.2">
              {menuAberto ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
      {menuAberto && (
        <nav id="menu-movel" className="md:hidden border-t border-white/15 px-4 py-3 flex flex-col gap-1" aria-label="Menu">
          {links}
          {usuario ? (
            <>
              <NavLink to="/conta" className={classeNav}>
                Minha conta
              </NavLink>
              <button onClick={aoSair} className="text-left px-3 py-2 rounded-md text-white/85 hover:bg-white/10 font-bold">
                Sair
              </button>
            </>
          ) : (
            <NavLink to="/entrar" className={classeNav}>
              Entrar ou criar conta
            </NavLink>
          )}
        </nav>
      )}
    </header>
  )
}

function Rodape() {
  return (
    <footer className="mt-24 bg-mar-escuro text-white/85">
      <div className="mx-auto max-w-6xl px-4 py-12 grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-3xl font-black text-white">ISAC Market</p>
          <p className="mt-3 max-w-sm">
            Vitrine dos pequenos vendedores da comunidade do Cabo. Parte de cada venda confirmada ajuda a manter as atividades do
            ISAC.
          </p>
        </div>
        <div>
          <p className="font-bold text-white mb-2">Para quem compra</p>
          <ul className="space-y-1">
            <li><Link className="hover:text-white hover:underline" to="/produtos">Ver produtos</Link></li>
            <li><Link className="hover:text-white hover:underline" to="/carrinho">Carrinho</Link></li>
            <li><Link className="hover:text-white hover:underline" to="/pedidos">Meus pedidos</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-bold text-white mb-2">Para quem vende</p>
          <ul className="space-y-1">
            <li><Link className="hover:text-white hover:underline" to="/minha-loja">Abrir minha loja</Link></li>
            <li><Link className="hover:text-white hover:underline" to="/#como-funciona">Como funciona a comissão</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-4 text-sm text-white/60">
          Projeto acadêmico. Pagamentos são simulados nesta versão: nenhum valor é cobrado de verdade.
        </p>
      </div>
    </footer>
  )
}

export default function Layout() {
  const local = useLocation()
  useEffect(() => {
    if (local.hash) document.getElementById(local.hash.slice(1))?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [local.pathname, local.hash])

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3">
        Pular para o conteúdo
      </a>
      {modoDemo && <FaixaDemo />}
      <Cabecalho />
      <main id="conteudo" className="flex-1">
        <Outlet />
      </main>
      <Rodape />
    </div>
  )
}
