import { useState } from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');

  const manejarSuscripcion = (e) => {
    e.preventDefault();

    if (nombre.trim() && email.trim()) {
      alert(`Obrigado por assinar, ${nombre}! Em breve você receberá nossas novidades.`);
      setNombre('');
      setEmail('');
    }
  };

  return (
    <footer className="voke-footer-maestro">

      {/* 1. BLOCO DE ASSINATURA DA NEWSLETTER */}
      <div className="voke-footer-boletin-bg">
        <div className="voke-footer-boletin-container">
          <div className="voke-boletin-info">
            <h3 className="voke-boletin-titulo">
              Assine nossa newsletter
            </h3>
            <p className="voke-boletin-sub">
              Receba novidades, ofertas especiais e histórias da Voke Brasil. Sem spam!
            </p>
          </div>

          <form onSubmit={manejarSuscripcion} className="voke-boletin-form">
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Seu nome"
              className="voke-boletin-input"
              required
            />

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Seu e-mail"
              className="voke-boletin-input"
              required
            />

            <button type="submit" className="voke-boletin-btn">
              Assinar newsletter
            </button>
          </form>
        </div>
      </div>

      {/* 2. CONTEÚDO PRINCIPAL DO RODAPÉ */}
      <div className="voke-footer-contenido-container">

        {/* Coluna da marca */}
        <div className="voke-footer-col-marca">
          <h2 className="voke-footer-logo">voke</h2>
          <p className="voke-footer-descripcion">
            Uma loja de eletrônicos seminovos com garantia e procedência.
            Equipamentos ideais para pessoas e empresas.
          </p>
        </div>

        {/* Coluna institucional */}
        <div className="voke-footer-col">
          <h4 className="voke-footer-col-titulo">Institucional</h4>
          <ul className="voke-footer-enlaces">
            <li><Link to="/sobre-voke">Sobre a Voke</Link></li>
            <li><Link to="/solucoes-b2b">Soluções para Empresas (B2B)</Link></li>
            <li><Link to="/blog">Blog</Link></li>
          </ul>
        </div>

        {/* Coluna de políticas e ajuda */}
        <div className="voke-footer-col">
          <h4 className="voke-footer-col-titulo">Políticas e Ajuda</h4>
          <ul className="voke-footer-enlaces">
            <li><Link to="/garantia">Garantia de 3 meses</Link></li>
            <li><Link to="/envios">Envios e Entregas</Link></li>
            <li><Link to="/terminos">Termos de Uso</Link></li>
            <li><Link to="/privacidade">Política de Privacidade</Link></li>
          </ul>
        </div>

        {/* Coluna de atendimento */}
        <div className="voke-footer-col" id="contato">
          <h4 className="voke-footer-col-titulo">Atendimento ao Cliente</h4>
          <p className="voke-footer-telefono">(31) 97222-5503</p>
          <p className="voke-footer-cnpj">CNPJ: 18.638.476/0001-18</p>
        </div>

      </div>

      {/* 3. FAIXA DE DIREITOS AUTORAIS */}
      <div className="voke-footer-derechos-bg">
        <div className="voke-footer-derechos-container">
          AGASUS SEMINOVOS | © 2025-2026 Voke. Todos os direitos reservados.
          <br />
          © 2026 Voke Simulação - Desenvolvido por Alberto Guatume para a Turma 58 Toti - Diversidade.
        </div>
      </div>

    </footer>
  );
};

export default Footer;