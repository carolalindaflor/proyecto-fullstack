import Navbar from '../components/Navbar';
import BannerCarousel from '../components/BannerCarousel';
import Footer from '../components/Footer';
import { useEffect, useState } from 'react';
import api from '../config/api';
import { Link } from 'react-router-dom';

function Inicio() {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [favoritos, setFavoritos] = useState({});
  const [notificacao, setNotificacao] = useState('');

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




  const manejarFavorito = async (idDelProducto, nombreProducto) => {
  const token = localStorage.getItem('voke_token');

  if (!token) {
    setNotificacao('Faça login para salvar seus favoritos.');

    setTimeout(() => {
      setNotificacao('');
    }, 3000);

    return;
  }

  try {
    if (favoritos[idDelProducto]) {
      await api.delete(`/favoritos/${idDelProducto}`);

      setFavoritos(prev => ({
        ...prev,
        [idDelProducto]: false
      }));

      setNotificacao(`"${nombreProducto}" removido dos favoritos.`);
    } else {
      await api.post('/favoritos', {
        productoId: Number(idDelProducto)
      });

      setFavoritos(prev => ({
        ...prev,
        [idDelProducto]: true
      }));

      setNotificacao(`"${nombreProducto}" adicionado aos favoritos!`);
    }

    setTimeout(() => {
      setNotificacao('');
    }, 3000);

  } catch (error) {
    console.error('Erro ao atualizar favoritos:', error);
    setNotificacao('Não foi possível atualizar os favoritos.');

    setTimeout(() => {
      setNotificacao('');
    }, 3000);
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
<p>
  Descubra nossa seleção especial de tecnologia
  e encontre o produto ideal para você.
</p>

          {carregando ? (
            <p>Carregando produtos...</p>
          ) : (
            <div className="voke-vitrina-grid">
              {produtos.slice(0, 4).map((prod) => {
                const precoBase = parseFloat(prod.precio || 0);
                const precoPix = precoBase * 0.95;
                const valorParcela = precoBase / 10;

                let urlImagem = 'https://placeholder.com';

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

                return (
                  <div key={prod.id} className="voke-tarjeta-producto">

                    <div className="voke-tarjeta-header">
  <div className="voke-tarjeta-acciones">
    <button
      type="button"
      title={favoritos[prod.id] ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      onClick={() => manejarFavorito(prod.id, prod.nombre)}
      className="voke-tarjeta-btn-icon"
style={{
  color: favoritos[prod.id] ? '#DC2626' : '#6D28D9',
  fontSize: '22px'
}}
    >
      {favoritos[prod.id] ? '♥' : '♡'}
    </button>
            </div>
            </div>
                    <div className="voke-tarjeta-imagen-box">
                      <img
                        src={urlImagem}
                        alt={prod.nombre || 'Produto Voke Brasil'}
                        className="voke-tarjeta-img"
                      />
                    </div>

                    <div className="voke-tarjeta-detalles">
                      <h3 className="voke-tarjeta-titulo">
                        {prod.nombre}
                      </h3>

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