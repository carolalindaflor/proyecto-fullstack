import Navbar from '../components/Navbar';
import BannerCarousel from '../components/BannerCarousel';
import Footer from '../components/Footer';
import { useEffect, useState } from 'react';
import api from '../config/api';
import { Link } from 'react-router-dom';

function Inicio() {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagemImagem, setMensagemImagem] = useState('');
  const [imagensComErro, setImagensComErro] = useState({});
  const [notificacao, setNotificacion] = useState('');
  const [favoritos, setFavoritos] = useState({});

  useEffect(() => {
    const carregarProdutos = async () => {
      try {
        const opcionesCatalogo = import.meta.env.DEV
          ? { baseURL: '/catalog-api' }
          : {};

        const resposta = await api.get('/produtos', opcionesCatalogo);
        setProdutos(resposta.data || []);

        console.log('Produtos recebidos na página inicial:', resposta.data);
      } catch (erro) {
        console.error('Erro ao carregar produtos em destaque:', erro);
      } finally {
        setCarregando(false);
      }
    };

    carregarProdutos();
  }, []);

  const manejarAgregarAlCarrito = async (productoId, nombreProducto) => {
    setNotificacion('');
    if (!localStorage.getItem('voke_token')) {
      setNotificacion('⚠️ Por favor, faça login para adicionar itens ao carrinho.');
      return;
    }

    try {
      await api.post('/carrinhos', {
        productoId: Number(productoId),
        cantidad: 1
      });
      setNotificacion(`📥 "${nombreProducto}" adicionado ao carrinho!`);
      window.dispatchEvent(new Event('carrito_actualizado'));
      window.setTimeout(() => setNotificacion(''), 3000);
    } catch (error) {
      console.error('Erro ao adicionar produto ao carrinho:', error);
      setNotificacion(
        error.response?.data?.error ||
        'Não foi possível adicionar o produto ao carrinho.'
      );
    }
  };

  return (
    <>
      <Navbar />
      {notificacao && (
  <div className="voke-toast-notificacion">
    {notificacao}
  </div>)}

      <main className="voke-inicio">
        <BannerCarousel />

        <section className="voke-inicio-boas-vindas">
  <h1>Bem-vindo à Voke Brasil!</h1>
  <p>
    Tecnologia inteligente para transformar seu dia a dia.
    Encontre produtos recondicionados com qualidade,
    garantia e economia.
  </p>
</section>
        <section className="voke-inicio-destaques">
          <h2>Produtos em destaque</h2>
          {notificacao && (
            <div className="voke-toast-notificacion" role="status">
              {notificacao}
            </div>
          )}
          <p>
            Explore nossa seleção de produtos e encontre tecnologia
            e praticidade para o seu dia a dia.
          </p>

          {carregando ? (
            <p>Carregando produtos...</p>
          ) : (
            <div className="voke-vitrina-grid">
              {produtos.slice(0, 4).map((prod) => {
                const precoBase = parseFloat(prod.precio || 0);
                const precoPix = precoBase * 0.95;
                const valorParcela = precoBase / 10;

                let urlImagem = '';
                if (
                  Array.isArray(prod.imagenes) &&
                  prod.imagenes.length > 0
                ) {
                  urlImagem = prod.imagenes[0];
                } else if (
                  typeof prod.imagenes === 'string' &&
                  prod.imagenes.trim() !== ''
                ) {
                  urlImagem = prod.imagenes;
                }

                const imagemDisponivel = Boolean(urlImagem) && !imagensComErro[prod.id];

                return (
                  <div key={prod.id} className="voke-tarjeta-producto">
                    <div className="voke-tarjeta-header">
                      <span className="voke-tarjeta-stock">
                        {Number(prod.stock) > 0
                          ? `Disponíveis: ${prod.stock}`
                          : 'Esgotado'}
                      </span>

                      <div className="voke-tarjeta-acciones">
                        <button
                          type="button"
                          className="voke-tarjeta-btn-icon"
                          aria-label={favoritos[prod.id]
                            ? 'Remover dos favoritos'
                            : 'Adicionar aos favoritos'}
                          aria-pressed={Boolean(favoritos[prod.id])}
                          onClick={() => setFavoritos(prev => ({
                            ...prev,
                            [prod.id]: !prev[prod.id]
                          }))}
                        >
                          {favoritos[prod.id] ? '❤️' : '🖤'}
                        </button>
                        <button
                          type="button"
                          className="voke-tarjeta-btn-icon"
                          aria-label={`Adicionar ${prod.nombre} ao carrinho`}
                          disabled={Number(prod.stock) <= 0}
                          onClick={() => manejarAgregarAlCarrito(prod.id, prod.nombre)}
                        >
                          🛒
                        </button>
                      </div>
                    </div>

                    <div className="voke-tarjeta-imagen-box">
                      {imagemDisponivel ? (
                        <Link
                          to={`/produtos?buscar=${encodeURIComponent(prod.nombre || '')}`}
                          aria-label={`Ver ${prod.nombre || 'produto'} no catálogo`}
                        >
                          <img
                            src={urlImagem}
                            alt={prod.nombre || 'Produto Voke Brasil'}
                            className="voke-tarjeta-img"
                            onError={() => setImagensComErro(prev => ({
                              ...prev,
                              [prod.id]: true
                            }))}
                          />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="voke-inicio-imagem-indisponivel"
                          onClick={() => setMensagemImagem(
                            `Produto não encontrado ou sem imagem disponível: ${prod.nombre || 'produto'}.`
                          )}
                        >
                          Imagem não disponível
                        </button>
                      )}
                    </div>

                    <div className="voke-tarjeta-detalles">
                      <h3 className="voke-tarjeta-titulo">
                        {prod.nombre}
                      </h3>
                      {prod.descripcion?.trim() && (
                        <p className="voke-tarjeta-descricao">
                          {prod.descripcion}
                        </p>
                      )}

                      <div className="voke-tarjeta-condicion">
                        💖 Muito bom
                      </div>

                      <div className="voke-tarjeta-precios-box">
                        <div className="voke-tarjeta-precio-pix">
                          R$ {precoPix.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })} via PIX
                        </div>

                        <div className="voke-tarjeta-precio-cuotas">
                          Ou 10x de R$ {valorParcela.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {mensagemImagem && (
            <p className="voke-inicio-mensagem-imagem" role="status">
              {mensagemImagem}
            </p>
          )}

          <Link to="/produtos" className="voke-inicio-ver-produtos">
            Ver todos os produtos
          </Link>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Inicio;