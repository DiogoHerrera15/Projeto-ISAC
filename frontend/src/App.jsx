import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import Layout from './components/Layout'
import Protegida from './components/Protegida'
import Inicio from './pages/Inicio'
import Catalogo from './pages/Catalogo'
import Produto from './pages/Produto'
import Loja from './pages/Loja'
import Carrinho from './pages/Carrinho'
import Entrar from './pages/Entrar'
import Cadastrar from './pages/Cadastrar'
import EsqueciSenha from './pages/EsqueciSenha'
import RedefinirSenha from './pages/RedefinirSenha'
import MeusPedidos from './pages/MeusPedidos'
import PedidoDetalhe from './pages/PedidoDetalhe'
import Conta from './pages/Conta'
import MinhaLoja from './pages/MinhaLoja'
import Admin from './pages/Admin'
import Servidor from './pages/Servidor'
import NaoEncontrada from './pages/NaoEncontrada'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Inicio />} />
              <Route path="produtos" element={<Catalogo />} />
              <Route path="produtos/:id" element={<Produto />} />
              <Route path="lojas/:id" element={<Loja />} />
              <Route path="carrinho" element={<Carrinho />} />
              <Route path="entrar" element={<Entrar />} />
              <Route path="cadastrar" element={<Cadastrar />} />
              <Route path="esqueci-senha" element={<EsqueciSenha />} />
              <Route path="redefinir-senha" element={<RedefinirSenha />} />
              <Route path="pedidos" element={<Protegida><MeusPedidos /></Protegida>} />
              <Route path="pedidos/:id" element={<Protegida><PedidoDetalhe /></Protegida>} />
              <Route path="conta" element={<Protegida><Conta /></Protegida>} />
              <Route path="minha-loja" element={<Protegida><MinhaLoja /></Protegida>} />
              <Route path="admin" element={<Protegida admin><Admin /></Protegida>} />
              <Route path="servidor" element={<Servidor />} />
              <Route path="*" element={<NaoEncontrada />} />
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
