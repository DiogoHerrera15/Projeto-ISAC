import { formatarMoeda } from '../lib/format'

/** Preço no formato de plaquinha de feira. */
export default function Etiqueta({ valor, tamanho = 'm', sobreBranco = false, className = '' }) {
  const [inteiro, centavos] = formatarMoeda(valor).replace('R$', '').trim().split(',')
  const tam = { p: 'text-xl', m: 'text-2xl', g: 'text-4xl', xg: 'text-6xl' }[tamanho]
  return (
    <span className={`etiqueta ${sobreBranco ? 'etiqueta-sobre-branco' : ''} ${tam} ${className}`}>
      <span className="sr-only">{formatarMoeda(valor)}</span>
      <span aria-hidden="true" className="text-[0.55em] font-bold">R$</span>
      <span aria-hidden="true">{inteiro}</span>
      <span aria-hidden="true" className="text-[0.55em] font-bold self-start mt-[0.1em]">,{centavos}</span>
    </span>
  )
}
