const ESTILOS = {
  pendente: ['bg-maracuja-claro text-[#6b4e00] border-maracuja', 'Aguardando pagamento'],
  confirmado: ['bg-ok-claro text-ok border-ok/40', 'Pagamento confirmado'],
  cancelado: ['bg-white text-tinta-suave border-linha', 'Cancelado'],
}

export default function StatusPedido({ status }) {
  const [classes, texto] = ESTILOS[status] || ESTILOS.cancelado
  return <span className={`inline-block rounded-full border px-3 py-0.5 text-sm font-bold whitespace-nowrap ${classes}`}>{texto}</span>
}
