import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Carregando } from './ui'

/** Exige login (e, se pedido, perfil de administrador) para ver a página. */
export default function Protegida({ admin = false, children }) {
  const { usuario, perfil, carregando } = useAuth()
  const local = useLocation()
  if (carregando) return <Carregando />
  if (!usuario) return <Navigate to="/entrar" replace state={{ voltarPara: local.pathname }} />
  if (admin && !perfil?.administrador) return <Navigate to="/" replace />
  return children
}
