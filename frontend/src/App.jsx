import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Catalogo from './pages/Catalogo';
import Inicio from './pages/Inicio';
import QuemSomos from './pages/QuemSomos';
import Carrito from './pages/Carrito';
import DashboardAdmin from './pages/DashboardAdmin';
import SeguimientoEnvio from './pages/SeguimientoEnvio';

// Proteção da rota administrativa
const ProtegerRutaAdmin = ({ children }) => {
  const token = localStorage.getItem('voke_token');
  const usuarioGuardado = localStorage.getItem('voke_usuario');

  // Verifica se o usuário está autenticado
  if (!token || !usuarioGuardado) {
    return <Navigate to="/login" replace />;
  }

  let user;

  try {
    user = JSON.parse(usuarioGuardado);
  } catch {
    // Remove somente os dados de acesso da Voke
    localStorage.removeItem('voke_token');
    localStorage.removeItem('voke_usuario');

    return <Navigate to="/login" replace />;
  }

  // Verifica se o perfil do usuário é administrador
  const perfilReal =
    user?.perfil ||
    user?.usuario?.perfil ||
    user?.user?.perfil ||
    '';

  if (String(perfilReal).toLowerCase() !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <div className="voke-layout-wrapper">
        <Routes>
          {/* Página inicial */}
          <Route path="/" element={<Inicio />} />

          {/* Páginas públicas */}
          <Route path="/quem-somos" element={<QuemSomos />} />
          <Route path="/produtos" element={<Catalogo />} />
          <Route path="/login" element={<Login />} />
          <Route path="/carrinho" element={<Carrito />} />

          {/* Acompanhamento de pedidos */}
          <Route path="/seguimiento" element={<SeguimientoEnvio />} />
          <Route path="/seguimiento/:id" element={<SeguimientoEnvio />} />

          {/* Painel administrativo protegido */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtegerRutaAdmin>
                <DashboardAdmin />
              </ProtegerRutaAdmin>
            }
          />

          {/* Redireciona rotas desconhecidas para a página inicial */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;