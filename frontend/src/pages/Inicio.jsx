import Navbar from '../components/Navbar';
import BannerCarousel from '../components/BannerCarousel';
import Footer from '../components/Footer';
import { useEffect, useState } from 'react';
import api from '../config/api';
import { Link } from 'react-router-dom';

function Inicio() {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);

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

  return (
    <>
      <Navbar />

      <main className="voke-inicio">
        <BannerCarousel />

        <section className="voke-inicio-boas-vindas">
          <h1>Bem-vindo à Voke Brasil!</h1>
          <p>
            Encontre tecnologia, qualidade e praticidade em um só lugar.
            Descubra produtos selecionados e ofertas especiais para facilitar
            o seu dia a dia.
          </p>
        </section>

        <section className="voke-inicio-destaques">
          <h2>Produtos em destaque</h2>
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