import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './BannerCarousel.css';

// Lista de banners
const BANNERS = [
  {
    id: 1,
    title: 'ACESSÓRIOS\npara Notebooks',
    subtitle: 'Tudo o que seu notebook precisa para mais desempenho e praticidade!',
    bgClass: 'banner-blue',
    imageUrl: 'Imagenes/auriculares.png',
    searchTerm: 'acessórios'
  },
  {
    id: 2,
    title: 'NOTEBOOKS\nCorporativos',
    subtitle: 'Desempenho corporativo com garantia de fábrica e o melhor custo-benefício.',
    bgClass: 'banner-dark',
    imageUrl: 'Imagenes/notebook.png',
    searchTerm: 'portátil'
  },
  {
    id: 3,
    title: 'SMARTPHONES\nRecondicionados',
    subtitle: 'Tecnologia de ponta com até 40% de economia e garantia de qualidade.',
    bgClass: 'banner-purple',
    imageUrl: 'Imagenes/smartphone.png',
    searchTerm: 'smartphones'
  },
  {
    id: 4,
    title: 'MONITORES\nGamers e Escritório',
    subtitle: 'Imagens nítidas e alta taxa de atualização para seu trabalho ou lazer.',
    bgClass: 'banner-teal',
    imageUrl: 'Imagenes/monitor.png',
    searchTerm: 'monitores'
  }
];

function BannerCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Troca automática a cada 5 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) =>
        prev === BANNERS.length - 1 ? 0 : prev + 1
      );
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const handlePrev = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? BANNERS.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prev) =>
      prev === BANNERS.length - 1 ? 0 : prev + 1
    );
  };

  const currentBanner = BANNERS[currentIndex];
  const catalogoUrl = `/produtos?buscar=${encodeURIComponent(currentBanner.searchTerm)}`;

  return (
    <div className="carousel-wrapper">
      <div className={`carousel-container ${currentBanner.bgClass}`}>

        {/* Botão de seta esquerda */}
        <button
          className="carousel-arrow arrow-left"
          onClick={handlePrev}
          aria-label="Anterior"
        >
          &#10094;
        </button>

        {/* Conteúdo do banner */}
        <div className="carousel-content">
          <div className="carousel-image-area">
            <Link
              to={catalogoUrl}
              className="carousel-image-link"
              aria-label={`Ver produtos: ${currentBanner.title.replace('\n', ' ')}`}
            >
              <img
                src={`${import.meta.env.BASE_URL}${currentBanner.imageUrl}`}
                alt={currentBanner.title.replace('\n', ' ')}
              />
            </Link>
          </div>

          <div className="carousel-text-area">
            <h1>{currentBanner.title}</h1>
            <p>{currentBanner.subtitle}</p>
          </div>
        </div>

        {/* Botão de seta direita */}
        <button
          className="carousel-arrow arrow-right"
          onClick={handleNext}
          aria-label="Seguinte"
        >
          &#10095;
        </button>

        {/* Indicadores */}
        <div className="carousel-indicators">
          {BANNERS.map((_, idx) => (
            <span
              key={idx}
              className={`dot ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(idx)}
            />
          ))}
        </div>

      </div>
    </div>
  );
}

export default BannerCarousel;