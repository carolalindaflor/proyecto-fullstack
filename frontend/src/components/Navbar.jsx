import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../config/api';
import DrawerMenu from './DrawerMenu'; // <-- IMPORTACIÓN DEL MENÚ LATERAL

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
  
  const mensajesVoke = [
    "Frete grátis para todo o Brasil em compras corporativas",
    "Até 10x sem juros no cartão de crédito",
    "Notebooks e Laptops reacondicionados com garantia de fábrica Voke",
    "Ofertas especiais de Primavera - Confira nossa vitrine local"
  ];

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
      } catch (e) {
        setUsuarioActivo(null);
      }
    } else {
      setUsuarioActivo(null);
    }
  };

  useEffect(() => {
    buscarUltimoPedidoUsuario();
    sincronizarUsuario();

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
      setIndiceMensaje((prevIndice) => (prevIndice + 1) % mensajesVoke.length);
    }, 4000);
    return () => clearInterval(temporizador);
  }, []);

  const moverMensajeIzquierda = () => {
    setIndiceMensaje((prevIndice) => (prevIndice - 1 + mensajesVoke.length) % mensajesVoke.length);
  };

  const moverMensajeDerecha = () => {
    setIndiceMensaje((prevIndice) => (prevIndice + 1) % mensajesVoke.length);
  };

  const manejarBusquedaSubmit = (e) => {
    e.preventDefault();
    if (terminoBusqueda.trim()) {
      navigate(`/?buscar=${encodeURIComponent(terminoBusqueda.trim())}`);
    } else {
      navigate('/');
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
    consultarCantidadCarrito();
    window.addEventListener('carrito_actualizado', consultarCantidadCarrito);
    return () => window.removeEventListener('carrito_actualizado', consultarCantidadCarrito);
  }, []);
  return (
    <div>   
      {/* 1. TOPE: BANNER AJUSTADO AL TEXTO */}
      <div className="voke-top-carousel-black">
        <div className="voke-carousel-content-wrapper">
          <span className="voke-carousel-flecha" onClick={moverMensajeIzquierda}>&lt;</span>
          <span className="voke-carousel-texto">{mensajesVoke[indiceMensaje]}</span>
          <span className="voke-carousel-flecha" onClick={moverMensajeDerecha}>&gt;</span>
        </div>
      </div>

      {/* 2. BARRA PRINCIPAL */}
      <div className="voke-navbar-main">
        <Link to="/" className="voke-nav-logo">voke</Link>
        
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
      </div>

      {/* 3. FRANJA INFERIOR FUCSIA CON ENLACES FILTRADORES CONECTADOS */}
      <div className="voke-menu-subbar">
        <div className="voke-menu-hamburguesa" onClick={() => setMenuOpen(true)}>☰</div>       
        <div className="voke-menu-links">
          <span className="voke-nav-link" onClick={() => filtrarPorFiltro('ofertas')}>Ofertas de primavera</span>
          <span>|</span>
          <span className="voke-nav-link" onClick={() => filtrarPorFiltro('Apple')}>tienda Apple</span>
          <span>|</span>
          <span className="voke-nav-link" onClick={() => filtrarPorFiltro('Samsung')}>Tienda Samsung</span>
          <span>|</span>
          <span className="voke-nav-link" onClick={() => filtrarPorFiltro('Lenovo')}>Tienda Lenovo</span>
          <span>|</span>
          <span className="voke-nav-link" onClick={() => filtrarPorFiltro('Dell')}>Tienda Dell</span>
        </div>
      </div>

      {/* 4. ACOPLE DEL COMPONENTE MENÚ LATERAL */}
      <DrawerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
};

export default Navbar;