import {HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Catalogo from './pages/Catalogo';
import Carrito from './pages/Carrito';
import DashboardAdmin from './pages/DashboardAdmin';
import SeguimientoEnvio from './pages/SeguimientoEnvio';

// 🛡️ COMPONENTE GUARDIÁN DE SEGURIDAD (MIDDLEWARE DE FRONTEND)
// const ProtegerRutaAdmin = ({ children }) => {
//   const token = localStorage.getItem('voke_token');
//   const usuarioGuardado = localStorage.getItem('voke_usuario');
//   const user = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;

//   // REGLA DE ACCESO ESTRICTA: Debe tener token activo y perfil de administrador
//   if (!token || !user || user.perfil !== 'admin') {
//     // Si no cumple, lo expulsa inmediatamente a la pantalla de acceso tradicional
//     return <Navigate to="/login" replace />;
//   }

//   return children;
// };

// 🛡️ COMPONENTE GUARDIÁN DE SEGURIDAD RECALIBRADO PARA PRODUCCIÓN
const ProtegerRutaAdmin = ({ children }) => {
  const token = localStorage.getItem('voke_token');
  const usuarioGuardado = localStorage.getItem('voke_usuario');

   
  // 1. Si no hay absolutamente nada en la memoria, se expulsa directo al login
  if (!token || !usuarioGuardado) {
    return <Navigate to="/login" replace />;
  }

  let user;
  try {
    user = JSON.parse(usuarioGuardado);
  } catch {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  const perfilReal = user?.perfil || user?.usuario?.perfil || user?.user?.perfil || '';
  if (perfilReal.toLowerCase() !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
   <Router >
    <navbar />
      <div className="voke-layout-wrapper">
        <Routes>
          {/* Rutas Públicas de la Tienda Comercial */}
          <Route path="/" element={<Catalogo />} />
          <Route path="/login" element={<Login />} />
          <Route path="/carrinho" element={<Carrito />} />
          <Route path="/seguimiento" element={<SeguimientoEnvio />} />
          <Route path="/seguimiento/:id" element={<SeguimientoEnvio />} />
          
          {/* 🔒 RUTA ADMINISTRATIVA TOTALMENTE PROTEGIDA Y ENCAPSULADA */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtegerRutaAdmin>
                <DashboardAdmin />
              </ProtegerRutaAdmin>
            } 
          />

          {/* Redirección Universal por defecto */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}
export default App;