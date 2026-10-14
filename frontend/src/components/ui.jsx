import { useId } from 'react'
import { Link } from 'react-router-dom'

const VARIANTES = {
  primario: 'bg-mar text-white hover:bg-mar-escuro disabled:bg-mar/50',
  destaque: 'bg-maracuja text-tinta hover:brightness-95 disabled:opacity-60',
  secundario: 'bg-white text-mar border-2 border-mar hover:bg-mar-claro disabled:opacity-50',
  perigo: 'bg-white text-alerta border-2 border-alerta/60 hover:bg-alerta-claro disabled:opacity-50',
  claro: 'border-2 border-white/70 text-white hover:bg-white hover:text-mar',
  texto: 'text-mar underline underline-offset-4 decoration-2 decoration-mar/30 hover:decoration-mar px-0',
}
const TAMANHOS = {
  p: 'text-sm px-3 py-1.5',
  m: 'text-base px-5 py-2.5',
  g: 'text-lg px-6 py-3.5',
}

export function classesBotao({ variante = 'primario', tamanho = 'm', className = '' } = {}) {
  return [
    'inline-flex items-center justify-center gap-2 rounded-md font-bold transition-colors cursor-pointer disabled:cursor-not-allowed',
    VARIANTES[variante],
    variante === 'texto' ? 'text-base' : TAMANHOS[tamanho],
    className,
  ].join(' ')
}

export function Botao({ variante, tamanho, className, carregando, children, ...props }) {
  return (
    <button className={classesBotao({ variante, tamanho, className })} disabled={carregando || props.disabled} {...props}>
      {carregando && <Giro />}
      {children}
    </button>
  )
}

export function BotaoLink({ variante, tamanho, className, ...props }) {
  return <Link className={classesBotao({ variante, tamanho, className })} {...props} />
}

function Giro() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-4 rounded-full border-2 border-current border-r-transparent animate-spin"
    />
  )
}

const classeEntrada =
  'w-full rounded-md border-2 border-linha bg-white px-3 py-2.5 text-tinta placeholder:text-tinta-suave/60 focus:border-mar focus:outline-none aria-[invalid=true]:border-alerta'

export function Campo({ rotulo, dica, erro, como = 'input', className = '', children, ...props }) {
  const id = useId()
  const Elemento = como
  return (
    <div className={className}>
      <label htmlFor={id} className="block font-bold mb-1.5">
        {rotulo}
      </label>
      {children ?? (
        <Elemento
          id={id}
          className={`${classeEntrada} ${como === 'textarea' ? 'min-h-28' : ''}`}
          aria-invalid={erro ? 'true' : undefined}
          aria-describedby={dica || erro ? `${id}-dica` : undefined}
          {...props}
        />
      )}
      {(erro || dica) && (
        <p id={`${id}-dica`} className={`mt-1 text-sm ${erro ? 'text-alerta font-bold' : 'text-tinta-suave'}`}>
          {erro || dica}
        </p>
      )}
    </div>
  )
}

export function Selecao({ className = '', ...props }) {
  return <select className={`${classeEntrada} ${className}`} {...props} />
}

const AVISOS = {
  info: 'bg-mar-claro text-mar-escuro border-mar/30',
  erro: 'bg-alerta-claro text-alerta border-alerta/30',
  ok: 'bg-ok-claro text-ok border-ok/30',
  atencao: 'bg-maracuja-claro text-tinta border-maracuja',
}

export function Aviso({ tipo = 'info', children, className = '' }) {
  return (
    <div role={tipo === 'erro' ? 'alert' : 'status'} className={`rounded-md border-l-4 px-4 py-3 ${AVISOS[tipo]} ${className}`}>
      {children}
    </div>
  )
}

export function Carregando({ texto = 'Carregando…' }) {
  return (
    <div className="flex items-center gap-3 py-16 justify-center text-tinta-suave" role="status">
      <Giro />
      {texto}
    </div>
  )
}

export function Vazio({ titulo, children, acao }) {
  return (
    <div className="border-2 border-dashed border-linha rounded-lg px-6 py-12 text-center">
      <h2 className="text-3xl font-bold mb-2">{titulo}</h2>
      {children && <p className="text-tinta-suave max-w-md mx-auto">{children}</p>}
      {acao && <div className="mt-6">{acao}</div>}
    </div>
  )
}

export function Abas({ abas, ativa, aoMudar }) {
  return (
    <div role="tablist" className="flex gap-1 border-b-2 border-linha overflow-x-auto">
      {abas.map((a) => (
        <button
          key={a.id}
          role="tab"
          aria-selected={ativa === a.id}
          onClick={() => aoMudar(a.id)}
          className={`shrink-0 px-4 py-2.5 -mb-0.5 font-bold border-b-4 transition-colors cursor-pointer ${
            ativa === a.id ? 'border-mar text-mar' : 'border-transparent text-tinta-suave hover:text-tinta'
          }`}
        >
          {a.rotulo}
          {a.contador != null && (
            <span className="ml-2 inline-block min-w-6 rounded-full bg-maracuja px-1.5 text-sm text-tinta">
              {a.contador}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function TituloPagina({ titulo, children, acoes }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div>
        <h1 className="text-5xl sm:text-6xl font-extrabold">{titulo}</h1>
        {children && <p className="mt-2 text-tinta-suave max-w-2xl">{children}</p>}
      </div>
      {acoes}
    </div>
  )
}
