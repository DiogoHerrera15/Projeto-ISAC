// Mostra a foto do produto ou, sem foto, um ladrilho com a inicial do nome.
const TONS = ['#0e4d5c', '#2e6b47', '#a3324a', '#2b5c9e', '#7a5a12']

function tom(texto = '') {
  let h = 0
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return TONS[h % TONS.length]
}

export default function ProdutoImagem({ produto, className = '' }) {
  if (produto?.foto_url) {
    return (
      <img
        src={produto.foto_url}
        alt={produto.nome}
        loading="lazy"
        className={`w-full h-full object-cover bg-mar-claro ${className}`}
      />
    )
  }
  const iniciais = (produto?.nome || '?')
    .split(' ')
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  return (
    <div
      role="img"
      aria-label={`${produto?.nome ?? 'Produto'} (sem foto)`}
      className={`@container azulejo w-full h-full flex items-center justify-center ${className}`}
      style={{ backgroundColor: tom(produto?.nome) }}
    >
      <span className="font-display font-black text-white/90 text-[44cqw] leading-none tracking-tight">
        {iniciais || '?'}
      </span>
    </div>
  )
}
