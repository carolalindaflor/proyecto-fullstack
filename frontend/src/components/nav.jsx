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
  // ESTADO MAESTRO PARA CONTROLAR LA APERTURA DEL MENÚ LATERAL
  const [menuOpen, setMenuOpen] = useState(false);
  
// Función inteligente para buscar el último pedido activo del usuario logueado
  const buscarUltimoPedidoUsuario = async () => {
    const token = localStorage.getItem('voke_token');
    if (!token) return;

    try {
      const configuracion = { headers: { 'Authorization': `Bearer ${token}` } };
      
      // Consultamos al backend la nómina de pedidos para extraer el último de este cliente
      const res = await api.get('/logistica/mis-pedidos', configuracion);
      
      // Obtenemos los datos del usuario actual desde el LocalStorage
      const usuarioGuardado = localStorage.getItem('voke_usuario');
      const user = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;

      if (res.data && user) {
        // Filtramos de forma relacional para encontrar solo los pedidos que le pertenecen a este cliente
        const pedidosFiltrados = res.data.filter(p => p.nome_completo === user.usuario?.nome_completo || p.email === user.email);
        
        if (pedidosFiltrados.length > 0) {
          // Guardamos el ID del pedido más reciente (el primero de la lista por orden descendente)
          setUltimoPedidoId(pedidosFiltrados[0].id);
        }
      }
    } catch (err) {
      console.error("Error al buscar pedido automático en Navbar:", err);
    }
  };

  useEffect(() => {
    queueMicrotask(buscarUltimoPedidoUsuario);

    // Tu lógica nativa de escuchar cambios en el carrito se mantiene idéntica...
    const actualizarContador = () => {
      // (Aquí va tu código actual que lee los badges del carrito)
    };
    window.addEventListener('carrito_actualizado', actualizarContador);
    return () => window.removeEventListener('carrito_actualizado', actualizarContador);
  }, []);

  // Función manejadora para el botón de un solo clic
  const irAlRastreoAutomatico = () => {
    if (ultimoPedidoId) {
      navigate(`/seguimiento/${ultimoPedidoId}`); // Lo lleva directo a su Timeline con el ID
    } else {
      navigate('/seguimiento'); // Si no tiene pedidos, lo lleva a la barra de búsqueda tradicional
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

  // FUNCIÓN DE BÚSQUEDA REAL: Filtra al presionar Enter
  const manejarBusquedaSubmit = (e) => {
    e.preventDefault();
    if (terminoBusqueda.trim()) {
      navigate(`/?buscar=${encodeURIComponent(terminoBusqueda.trim())}`);
    } else {
      navigate('/');
    }
  };

  // FUNCIÓN DE ENLACES: Filtra por categoría o marca directo a la URL
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
          {/* CONTROL DE SESIÓN DINÁMICO EN LA NAVBAR */}
          {localStorage.getItem('voke_token') ? (
            <button 
              type="button" 
              onClick={() => {
                localStorage.clear(); // Limpia token y perfil de la memoria del navegador
                window.dispatchEvent(new Event('carrito_actualizado')); // Sincroniza componentes
                navigate('/'); // Redirige al login de inmediato
              }} 
              className="voke-navbar-btn-sair"
              title="Cerrar Sesión"
            >
              🚪 Sair
            </button>
          ) : (
            <Link to="/login" className="voke-nav-link" title="Minha Conta">👤</Link>
          )}
        {/* INTERFAZ ACCESIBLE AUTOMÁTICA: 
            Aparece solo si hay sesión activa para guiar al usuario sin requerir URLs manuales */}
        {localStorage.getItem('voke_token') && (
          <button 
            type="button" 
            onClick={irAlRastreoAutomatico}
            className="voke-nav-link-texto"
            title="Acompanhar o status da minha entrega em tempo real"
          >
            🚚Envio
          </button>
        )}
          <Link to="/carrinho" className="voke-nav-link" title="Carrinho">
            <span>🛒</span>
            <span className="voke-cart-badge">{cantidadTotal}</span>
          </Link>
        </div>
      </div>
      {/* 3. FRANJA INFERIOR FUCSIA CON ENLACES FILTRADORES CONECTADOS */}
      <div className="voke-menu-subbar">
        {/* CORRECCIÓN: Ahora al hacer clic cambia el estado a true y abre el Drawer */}
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