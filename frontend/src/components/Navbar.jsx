import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../config/api';
import DrawerMenu from './DrawerMenu'; // <-- IMPORTACIÓN DEL MENÚ LATERAL

const MENSAJES_VOKE = [
  'Frete grátis para todo o Brasil em compras corporativas',
  'Até 10x sem juros no cartão de crédito',
  'Notebooks e Laptops reacondicionados com garantia de fábrica Voke',
  'Ofertas especiais de Primavera - Confira nossa vitrine local'
];

const Navbar = () => {
  const navigate = useNavigate();
  const [cantidadTotal, setCantidadTotal] = useState(0);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [ultimoPedidoId, setUltimoPedidoId] = useState(null);

  // 🚀 ESTADO ADAPTADO: Controla la apertura del menú desplegable del perfil 👤
  const [perfilMenuOpen, setPerfilMenuOpen] = useState(false);
  // 🚀 ESTADO ADAPTADO: Guarda los datos del usuario logueado de forma local en el componente
  const [usuarioActivo, setUsuarioActivo] = useState(null);

  // ESTADO MAESTRO PARA CONTROLAR LA APERTURA DEL MENÚ LATERAL
  const [menuOpen, setMenuOpen] = useState(false);

  // Función inteligente para buscar el último pedido activo del usuario logueado
  const buscarUltimoPedidoUsuario = async () => {
    const token = localStorage.getItem('voke_token');
    if (!token) return;

    try {
      const configuracion = { headers: { 'Authorization': `Bearer ${token}` } };
      const res = await api.get('/logistica/mis-pedidos', configuracion);

      const usuarioGuardado = localStorage.getItem('voke_usuario');
      const user = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;

      if (res.data && user) {
        const pedidosFiltrados = res.data.filter(p => p.nome_completo === user.nome_completo || p.email === user.email);
        if (pedidosFiltrados.length > 0) {
          setUltimoPedidoId(pedidosFiltrados[0].id);
        }
      }
    } catch (err) {
      console.error("Error al buscar pedido automático en Navbar:", err);
    }
  };

  // Sincroniza el estado del usuario activo leyendo el localStorage al montar y al recibir eventos
  const sincronizarUsuario = () => {
    const usuarioGuardado = localStorage.getItem('voke_usuario');
    if (usuarioGuardado) {
      try {
        setUsuarioActivo(JSON.parse(usuarioGuardado));
      } catch {
        setUsuarioActivo(null);
      }
    } else {
      setUsuarioActivo(null);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      buscarUltimoPedidoUsuario();
      sincronizarUsuario();
    });

    // Escuchamos el evento de actualizar para mantener sincronizado el perfil y el carrito
    window.addEventListener('carrito_actualizado', sincronizarUsuario);
    return () => window.removeEventListener('carrito_actualizado', sincronizarUsuario);
  }, []);

  const irAlRastreoAutomatico = () => {
    if (ultimoPedidoId) {
      navigate(`/seguimiento/${ultimoPedidoId}`);
    } else {
      navigate('/seguimiento');
    }
  };

  const [indiceMensaje, setIndiceMensaje] = useState(0);

  useEffect(() => {
    const temporizador = setInterval(() => {
      setIndiceMensaje((prevIndice) => (prevIndice + 1) % MENSAJES_VOKE.length);
    }, 4000);
    return () => clearInterval(temporizador);
  }, []);

  const moverMensajeIzquierda = () => {
    setIndiceMensaje((prevIndice) => (prevIndice - 1 + MENSAJES_VOKE.length) % MENSAJES_VOKE.length);
  };

  const moverMensajeDerecha = () => {
    setIndiceMensaje((prevIndice) => (prevIndice + 1) % MENSAJES_VOKE.length);
  };

  const manejarBusquedaSubmit = (e) => {
    e.preventDefault();
    if (terminoBusqueda.trim()) {
      navigate(`/produtos?buscar=${encodeURIComponent(terminoBusqueda.trim())}`);
    } else {
      navigate('/produtos');
    }
  };

  const filtrarPorFiltro = (valorFiltro) => {
    if (valorFiltro === 'ofertas') {
      navigate('/');
    } else {
      navigate(`/?buscar=${encodeURIComponent(valorFiltro)}`);
    }
  };

  const consultarCantidadCarrito = async () => {
    try {
      const token = localStorage.getItem('voke_token');
      if (!token) return setCantidadTotal(0);
      const respuesta = await api.get('/carrinhos');
      const items = respuesta.data.items || [];
      setCantidadTotal(items.reduce((acc, curr) => acc + parseInt(curr.cantidad), 0));
    } catch (error) {
      console.error("Erro ao atualizar contador:", error);
    }
  };

  useEffect(() => {
    queueMicrotask(consultarCantidadCarrito);
    window.addEventListener('carrito_actualizado', consultarCantidadCarrito);
    return () => window.removeEventListener('carrito_actualizado', consultarCantidadCarrito);
  }, []);
  return (
    <div>
      {/* 1. TOPE: BANNER AJUSTADO AL TEXTO */}
      <div className="voke-top-carousel-black">
        <div className="voke-carousel-content-wrapper">
          <span className="voke-carousel-flecha" onClick={moverMensajeIzquierda}>&lt;</span>
          <span className="voke-carousel-texto">{MENSAJES_VOKE[indiceMensaje]}</span>
          <span className="voke-carousel-flecha" onClick={moverMensajeDerecha}>&gt;</span>
        </div>
      </div>

      {/* 2. BARRA PRINCIPAL */}
      <div className="voke-navbar-main">
        <Link
          to="/"
          className="voke-nav-logo"
          aria-label="Voke Brasil"
        >
          <svg
  width="140"
  height="90"
  viewBox="0 0 220 140"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  role="img"
  aria-label="Voke Brasil"
>
  <path
    d="M110 15 C130 15 145 25 140 40 C148 50 142 62 130 68 C120 72 110 65 105 55 C95 55 88 45 92 32 C95 20 102 15 110 15Z"
    fill="#009944"
  />
  <path
    d="M82 38 L104 68 L138 20 L126 15 L102 52 L88 32Z"
    fill="#00529B"
  />
  <path
    d="M96 48 L104 60 L126 28 L120 25 L102 50 L98 44Z"
    fill="#00A859"
  />
  <text x="110" y="100" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="28" fill="#0A2540" textAnchor="middle" letterSpacing="1.5">
    VOKE
  </text>
  <text x="110" y="122" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="16" fill="#00529B" textAnchor="middle" letterSpacing="4">
    BRASIL
  </text>
</svg>
        </Link>

        {/* RESTRUCTURACIÓN: EL BUSCADOR AHORA ES UN FORMULARIO FUNCIONAL */}
        <form onSubmit={manejarBusquedaSubmit} className="voke-search-container">
          <input
            type="text"
            value={terminoBusqueda}
            onChange={(e) => setTerminoBusqueda(e.target.value)}
            placeholder="Busque o que você precisa..."
            className="voke-search-input"
          />
          <span className="voke-search-lupa" onClick={manejarBusquedaSubmit}>🔍</span>
        </form>

        <div className="voke-nav-controls">
          <span className="voke-nav-link" title="Favoritos">🖤</span>

          {/* ⚡ CONTENEDOR FLOTANTE DEL ICONO DE USUARIO Y SU MENÚ DESPLEGABLE */}
          <div className="voke-profile-menu-container">
            <span
              className="voke-nav-link voke-nav-link-pointer"
              title="Minha Conta"
              onClick={() => {
                if (!localStorage.getItem('voke_token')) {
                  navigate('/login');
                } else {
                  setPerfilMenuOpen(!perfilMenuOpen);
                }
              }}
            >
              👤 {localStorage.getItem('voke_token') && <small className="voke-user-online-badge">●</small>}
            </span>

            {/* 📋 SUBMENÚ FLOTANTE CORPORATIVO (Aparece únicamente si el token está activo y se pulsa 👤) */}
            {localStorage.getItem('voke_token') && perfilMenuOpen && (
              <div className="voke-dropdown-perfil-box">
                {usuarioActivo && (
                  <p className="voke-dropdown-welcome-text">
                    Olá, {usuarioActivo.nome_completo ? usuarioActivo.nome_completo.split(' ')[0] : 'Cliente'}
                  </p>
                )}

                {/* Opción 1: Modificar Conta (Abre tu CRUD en Login.jsx) */}
                <div
                  onClick={() => { navigate('/login'); setPerfilMenuOpen(false); }}
                  className="voke-dropdown-item"
                >
                  ⚙️ Modificar Conta
                </div>

                {/* Opción 2: Envio (Llama a tu función nativa de rastreo automático) */}
                <div
                  onClick={() => { irAlRastreoAutomatico(); setPerfilMenuOpen(false); }}
                  className="voke-dropdown-item"
                >
                  🚚 Envio
                </div>

                <hr className="voke-dropdown-divider" />

                {/* Opción 3: Sair (Cierre de sesión limpio y seguro) */}
                <div
                  onClick={() => {
                    localStorage.clear();
                    window.dispatchEvent(new Event('carrito_actualizado'));
                    setPerfilMenuOpen(false);
                    setUsuarioActivo(null);
                    navigate('/');
                  }}
                  className="voke-dropdown-item voke-dropdown-item-logout"
                >
                  🚪 Sair
                </div>
              </div>
            )}
          </div>

         <Link to="/carrinho" className="voke-nav-link" title="Carrinho">
        <span>🛒</span>
         <span className="voke-cart-badge">{cantidadTotal}</span>
        </Link>

</div>
  </div> {/* fecha voke-navbar-main */}
   {/* MENU INFERIOR */}
        <div className="voke-menu-subbar">

          <span
            className="voke-nav-link"
            onClick={() => navigate('/')}
          >
            Início
          </span>

          <span
            className="voke-nav-link"
            onClick={() => navigate('/quem-somos')}
          >
            Quem Somos
          </span>

          <span
            className="voke-nav-link"
            onClick={() => setMenuOpen(true)}
          >
            Categorias
          </span>

          <span
            className="voke-nav-link"
            onClick={() => filtrarPorFiltro('ofertas')}
          >
            Ofertas
          </span>

          <span
            className="voke-nav-link"
            onClick={() => {
              document.getElementById('contato')?.scrollIntoView({
                behavior: 'smooth'
              });
            }}
          >
            Contato
          </span>

       </div>

      {/* MENU LATERAL */}
      <DrawerMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
    </div>
  );
};
export default Navbar;