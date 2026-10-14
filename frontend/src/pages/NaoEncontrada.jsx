import { BotaoLink, Vazio } from '../components/ui'

export default function NaoEncontrada() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <Vazio titulo="Página não encontrada" acao={<BotaoLink to="/">Voltar ao início</BotaoLink>}>
        O endereço pode ter mudado ou foi digitado errado.
      </Vazio>
    </div>
  )
}
