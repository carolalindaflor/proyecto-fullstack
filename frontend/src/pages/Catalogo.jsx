import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../config/api';
import BannerCarousel from '../components/BannerCarousel';

const normalizarTexto = valor => String(valor || '')
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

  // Carregar produtos e categorias
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

        const categoriasData = respuestaCategorias.data || [];
        setCategorias(categoriasData);

        let listaFiltrada = Array.isArray(respuestaProductos.data)
          ? respuestaProductos.data
          : [];

        const queryParams = new URLSearchParams(location.search);

// Recupera os filtros da URL
const queryParams = new URLSearchParams(location.search);
const terminoBuscar =
  normalizarTexto(queryParams.get('buscar')?.trim() || '');

        const terminoCategoria =
          queryParams.get('categoria')?.trim() || '';

const terminoMarca =
  normalizarTexto(queryParams.get('marca')?.trim() || '');

        if (terminoCategoria) {
          const categoriaPorId = categoriasData.find(
            categoria => String(categoria.id) === terminoCategoria
          );

          const categoriaSeleccionada = categoriaPorId || categoriasData.find(
            categoria =>
              normalizarTexto(categoria.nombre) ===
              normalizarTexto(terminoCategoria)
          );

          listaFiltrada = categoriaSeleccionada
            ? listaFiltrada.filter(
                prod =>
                  Number(prod.categoria_id) ===
                  Number(categoriaSeleccionada.id)
              )
            : [];
        }

        if (terminoMarca) {
          listaFiltrada = listaFiltrada.filter(prod => {
            return normalizarTexto(prod.marca) === terminoMarca;
          });
        }

        if (terminoBuscar) {
          listaFiltrada = listaFiltrada.filter(prod => {
            const categoriaProducto = categoriasData.find(
              categoria => String(categoria.id) === String(prod.categoria_id)
            )?.nombre;

            return [
              prod.nombre,
              prod.marca,
              prod.descripcion,
              categoriaProducto
            ].some(campo => normalizarTexto(campo).includes(terminoBuscar));
          });
        }

        setProductos(listaFiltrada);

      } catch (error) {
        console.error(
          'Erro ao consumir a API de produtos de Voke:',
          error
        );
      } finally {
        setCargando(false);
      }
    };

    cargarYFiltrarProductos();
  }, [location.search]);

  // Carregar favoritos do cliente autenticado
  useEffect(() => {
    const carregarFavoritos = async () => {
      const token = localStorage.getItem('voke_token');

      if (!token) {
        setFavoritos({});
        return;
      }

      try {
        const resposta = await api.get('/favoritos');

        const favoritosSalvos = {};

        resposta.data.forEach(favorito => {
          favoritosSalvos[favorito.id] = true;
        });

        setFavoritos(favoritosSalvos);

      } catch (error) {
        console.error('Erro ao carregar favoritos:', error);
      }
    };

    carregarFavoritos();
  }, []);

  // Adicionar ou remover produto dos favoritos
  const manejarFavorito = async (idDelProducto, nombreProducto) => {
    const token = localStorage.getItem('voke_token');

    if (!token) {
      setNotificacion('Faça login para salvar seus favoritos.');
      return;
    }

    try {
      if (favoritos[idDelProducto]) {
        await api.delete(`/favoritos/${idDelProducto}`);

        setFavoritos(prev => ({
          ...prev,
          [idDelProducto]: false
        }));

        setNotificacion(
          `"${nombreProducto}" removido dos favoritos.`
        );

      } else {
        await api.post('/favoritos', {
          productoId: Number(idDelProducto)
        });

        setFavoritos(prev => ({
          ...prev,
          [idDelProducto]: true
        }));

        setNotificacion(
          `"${nombreProducto}" adicionado aos favoritos!`
        );
      }

      window.dispatchEvent(
        new Event('favoritos_actualizados')
      );

      setTimeout(() => setNotificacion(''), 3000);

    } catch (error) {
      console.error('Erro ao atualizar favoritos:', error);
      setNotificacion(
        'Não foi possível atualizar os favoritos.'
      );
    }
  };

  // Adicionar produto ao carrinho
  const manejarAgregarAlCarrito = async (
    idDelProducto,
    nombreProducto
  ) => {
    try {
      setNotificacion('');

      const token = localStorage.getItem('voke_token');

      if (!token) {
        setNotificacion(
          '⚠️ Por favor, faça login para adicionar itens ao carrinho.'
        );
        return;
      }

      await api.post('/carrinhos', {
        productoId: parseInt(idDelProducto),
        cantidad: 1
      });

      setNotificacion(
        `📥 "${nombreProducto}" adicionado ao carrinho!`
      );

      setActualizarContador(prev => prev + 1);

      window.dispatchEvent(
        new Event('carrito_actualizado')
      );

      setTimeout(() => setNotificacion(''), 3000);

    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
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

        <BannerCarousel />

        <div className="voke-catalogo-container">

          <div className="voke-catalogo-header-row">
            <span className="voke-catalogo-rayo">⚡</span>

            <h2 className="voke-catalogo-titulo-principal">
              {(() => {
                const queryParams = new URLSearchParams(
                  location.search ||
                  location.hash.split('?')[1] || ''
                );

                const cat = queryParams.get('categoria');
                const marc = queryParams.get('marca');

                const categoria = categorias.find(
                  item => String(item.id) === String(cat)
                );

                const nomesCategorias = {
                  notebooks: 'Notebooks',
                  computadores: 'Computadores',
                  smartphones: 'Smartphones',
                  tablets: 'Tablets',
                  monitores: 'Monitores',
                  escritorios: 'Escritórios',
                  cadernos: 'Cadernos',
                  cuadernos: 'Cadernos'
                };

                const nomeOriginal = categoria?.nombre || '';

                const nomeCategoria =
                  nomesCategorias[
                    normalizarTexto(nomeOriginal)
                  ] || nomeOriginal;

                if (cat && marc) {
                  return `Ofertas em ${nomeCategoria} ${marc}`;
                }

                if (cat) {
                  return `Ofertas em ${nomeCategoria}`;
                }

                if (marc) {
                  return `Ofertas de ${marc}`;
                }

                return 'As melhores ofertas';
              })()}
            </h2>
          </div>

          {cargando ? (
            <div className="voke-catalogo-cargando-box">
              <p>Carregando produtos...</p>
            </div>
          ) : (
            <div className="voke-vitrina-grid">

              {productos.length === 0 ? (
                <div className="voke-alerta-box">
                  Nenhum produto encontrado para esta busca na Voke.
                </div>
              ) : (
                productos.map(prod => {
                  const precioBase = parseFloat(prod.precio || 0);
                  const precioPix = precioBase * 0.95;
                  const valorCuota = precioBase / 10;

                  let urlImagen = 'https://placeholder.com';

                  if (prod.imagenes) {
                    if (
                      Array.isArray(prod.imagenes) &&
                      prod.imagenes.length > 0
                    ) {
                      urlImagen = prod.imagenes[0];

                    } else if (
                      typeof prod.imagenes === 'string' &&
                      prod.imagenes.trim() !== ''
                    ) {
                      urlImagen = prod.imagenes;
                    }
                  }

                  return (
                    <div
                      key={prod.id}
                      className="voke-tarjeta-producto"
                    >

                      <div className="voke-tarjeta-header">
                        <span className="voke-tarjeta-stock">
                          {prod.stock > 0
                            ? `Disponíveis: ${prod.stock}`
                            : 'Esgotado'}
                        </span>

                        <div className="voke-tarjeta-acciones">

                         <button
                        type="button"
                      title={
                        favoritos[prod.id]
                       ? 'Remover dos favoritos'
                       : 'Adicionar aos favoritos'
                       }
                       onClick={() =>
                       manejarFavorito(prod.id, prod.nombre)
                        }
                     className="voke-tarjeta-btn-icon"
                    style={{ color: '#6D28D9', fontSize: '22px' }}
                      >
                    {favoritos[prod.id] ? '♥' : '♡'}
                    </button> 

                          <button
                            type="button"
                            disabled={prod.stock <= 0}
                            onClick={() =>
                              manejarAgregarAlCarrito(
                                prod.id,
                                prod.nombre
                              )
                            }
                            className="voke-tarjeta-btn-icon"
                          >
                            🛒
                          </button>

                        </div>
                      </div>

                      <div className="voke-tarjeta-imagen-box">
                        <img
                          src={urlImagen}
                          alt={prod.nombre}
                          className="voke-tarjeta-img"
                        />
                      </div>

                      <div className="voke-tarjeta-detalles">
                        <h3 className="voke-tarjeta-titulo">{prod.nombre}</h3>
                        {prod.descripcion?.trim() && (
                          <p className="voke-tarjeta-descricao">
                            {prod.descripcion}
                          </p>
                        )}
                        <div className="voke-tarjeta-condicion">💖 Muito bom</div>

                        <div className="voke-tarjeta-precios-box">

                          <div className="voke-tarjeta-precio-pix">
                            R$ {precioPix.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                            <span className="voke-form-subtitle-text">
                              {' '}via PIX
                            </span>
                          </div>

                          <div className="voke-tarjeta-precio-cuotas">
                            Ou 10x de{' '}
                            <span className="voke-tarjeta-cuota-destacada">
                              R$ {valorCuota.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </span>
                          </div>

                          <div className="voke-tarjeta-envio">
                            🚚 Frete grátis
                          </div>

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