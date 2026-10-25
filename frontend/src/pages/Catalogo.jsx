import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../config/api';
import BannerCarousel from '../components/BannerCarousel';

const normalizarTexto = valor => valor
  .toLocaleLowerCase('pt-BR')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const Catalogo = () => {
  const location = useLocation();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [notificacion, setNotificacion] = useState('');
  const [actualizarContador, setActualizarContador] = useState(0);
  const [favoritos, setFavoritos] = useState({});

  useEffect(() => {
    const cargarYFiltrarProductos = async () => {
      setCargando(true);
      try {
        const opcionesCatalogo = import.meta.env.DEV
          ? { baseURL: '/catalog-api' }
          : {};

        const [respuestaProductos, respuestaCategorias] = await Promise.all([
          api.get('/produtos', opcionesCatalogo),
          api.get('/categorias', opcionesCatalogo)
        ]);
        let listaFiltrada = respuestaProductos.data || [];
        const categoriasData = respuestaCategorias.data || [];
        setCategorias(categoriasData);

        const queryParams = new URLSearchParams(location.search);
        const terminoBuscar = queryParams.get('buscar')?.toLowerCase().trim() || '';
        const terminoCategoria = queryParams.get('categoria')?.trim() || '';
        const terminoMarca = queryParams.get('marca')?.toLowerCase().trim() || '';

        if (terminoCategoria) {
          const categoriaPorId = categoriasData.find(categoria => String(categoria.id) === terminoCategoria);
          const categoriaSeleccionada = categoriaPorId || categoriasData.find(
            categoria => normalizarTexto(categoria.nombre) === normalizarTexto(terminoCategoria)
          );

          listaFiltrada = categoriaSeleccionada
            ? listaFiltrada.filter(prod => Number(prod.categoria_id) === Number(categoriaSeleccionada.id))
            : [];
        }

        if (terminoMarca) {
          listaFiltrada = listaFiltrada.filter(prod => {
            const nombreProd = (prod.nombre || '').toLowerCase();
            const marcaProducto = (prod.marca || '').trim();
            const marcaABuscar = terminoMarca.toLocaleLowerCase('pt-BR');
            return marcaProducto
              ? normalizarTexto(marcaProducto) === normalizarTexto(marcaABuscar)
              : nombreProd.includes(marcaABuscar);
          });
        }

        if (terminoBuscar) {
          listaFiltrada = listaFiltrada.filter(prod => {
            const nombre = (prod.nombre || '').toLowerCase();
            const descripcion = (prod.descripcion || '').toLowerCase();
            return nombre.includes(terminoBuscar) || descripcion.includes(terminoBuscar);
          });
        }

        setProductos(listaFiltrada);
      } catch (error) {
        console.error("Erro ao consumir a API de produtos de Voke:", error);
      }
      setCargando(false);
    };

    cargarYFiltrarProductos();
  }, [location.search]);

  const manejarAgregarAlCarrito = async (idDelProducto, nombreProducto) => {
    try {
      setNotificacion('');
      const token = localStorage.getItem('voke_token');
      if (!token) {
        setNotificacion('⚠️ Por favor, faça login para adicionar itens ao carrinho.');
        return;
      }
      await api.post('/carrinhos', { productoId: parseInt(idDelProducto), cantidad: 1 });
      setNotificacion(`📥 "${nombreProducto}" adicionado ao carrinho!`);
      setActualizarContador(prev => prev + 1);
      window.dispatchEvent(new Event('carrito_actualizado'));
      setTimeout(() => setNotificacion(''), 3000);
    } catch (error) {
      console.error("Erro ao adicionar produto:", error);
    }
  };

  return (
    <div className="voke-layout-wrapper">
      <div>
        <Navbar key={actualizarContador} />

        {notificacion && (
          <div className="voke-toast-notificacion">
            {notificacion}
          </div>
        )}

        {/* 🌟 BANNER / CARRUSEL PRINCIPAL AL ESTILO VOKE */}
        <BannerCarousel />

        {/* CONTENEDOR CENTRAL DE LA VITRINA */}
        <div className="voke-catalogo-container">

          {/* ENCABEZADO DE OFERTAS DINÁMICO */}
          <div className="voke-catalogo-header-row">
            <span className="voke-catalogo-rayo">⚡</span>
            <h2 className="voke-catalogo-titulo-principal">
              {(() => {
                const queryParams = new URLSearchParams(location.search);
                const cat = queryParams.get('categoria');
                const marc = queryParams.get('marca');
                const categoria = categorias.find(item =>
                  String(item.id) === cat || normalizarTexto(item.nombre) === normalizarTexto(cat || '')
                );
                const nomeCategoria = categoria?.nombre || cat;
                if (cat && marc) return `Ofertas em ${nomeCategoria} ${marc}`;
                if (cat) return `Ofertas em ${nomeCategoria}`;
                if (marc) return `Ofertas de ${marc}`;
                return "As melhores ofertas";
              })()}
            </h2>
          </div>

          {cargando ? (
            <div className="voke-catalogo-cargando-box">
              <p>Buscando estoque local...</p>
            </div>
          ) : (
            <div className="voke-vitrina-grid">
              {productos.length === 0 ? (
                <div className="voke-alerta-box">
                  Nenhum produto encontrado para esta busca na Voke.
                </div>
              ) : (
                productos.map((prod) => {
                  const precioBase = parseFloat(prod.precio || 0);
                  const precioPix = precioBase * 0.95;
                  const valorCuota = precioBase / 10;

                  let urlImagen = 'https://placeholder.com';
                  if (prod.imagenes) {
                    if (Array.isArray(prod.imagenes) && prod.imagenes.length > 0) {
                      urlImagen = prod.imagenes[0];
                    } else if (typeof prod.imagenes === 'string' && prod.imagenes.trim() !== '') {
                      urlImagen = prod.imagenes;
                    }
                  }

                  return (
                    <div key={prod.id} className="voke-tarjeta-producto">

                      {/* HEADER INTERNO */}
                      <div className="voke-tarjeta-header">
                        <span className="voke-tarjeta-stock">
                          {prod.stock > 0 ? `Queda ${prod.stock}` : 'Esgotado'}
                        </span>

                        <div className="voke-tarjeta-acciones">
                          <button
                            type="button"
                            onClick={() => setFavoritos(prev => ({ ...prev, [prod.id]: !prev[prod.id] }))}
                            className="voke-tarjeta-btn-icon"
                          >
                            {favoritos[prod.id] ? '❤️' : '🖤'}
                          </button>
                          <button
                            type="button"
                            disabled={prod.stock <= 0}
                            onClick={() => manejarAgregarAlCarrito(prod.id, prod.nombre)}
                            className="voke-tarjeta-btn-icon"
                          >
                            🛒
                          </button>
                        </div>
                      </div>

                      {/* CAJA DE IMAGEN */}
                      <div className="voke-tarjeta-imagen-box">
                        <img
                          src={urlImagen}
                          alt={prod.nombre}
                          className="voke-tarjeta-img"
                        />
                      </div>

                      {/* INFORMACIÓN DE PRECIOS */}
                      <div className="voke-tarjeta-detalles">
                        <h3 className="voke-tarjeta-titulo">{prod.nombre}</h3>
                        <div className="voke-tarjeta-condicion">💖 Muito bom</div>

                        <div className="voke-tarjeta-precios-box">
                          <div className="voke-tarjeta-precio-pix">
                            R$ {precioPix.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="voke-form-subtitle-text"> vía PIX</span>
                          </div>
                          <div className="voke-tarjeta-precio-cuotas">
                            Ou 10x de <span className="voke-tarjeta-cuota-destacada">R$ {valorCuota.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="voke-tarjeta-envio">🚚 Frete grátis</div>
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Catalogo;