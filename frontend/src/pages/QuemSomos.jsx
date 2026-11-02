import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './QuemSomos.css';

function QuemSomos() {
  return (
    <>
      <Navbar />

      <main className="quem-somos-page">
        <section className="quem-somos-hero">
          <span className="quem-somos-tag">CONHEÇA A VOKE BRASIL</span>

          <h1>
            Tecnologia que conecta,
            <span> qualidade que transforma!</span>
          </h1>

          <p>
            Acreditamos que a tecnologia deve estar ao alcance de todos.
            Por isso, oferecemos produtos tecnológicos com qualidade,
            praticidade e uma experiência de compra simples e acessível.
          </p>
        </section>

        <section className="quem-somos-conteudo">
          <div>
            <h2>Quem somos</h2>
            <p>
              A Voke Brasil é uma plataforma de comércio eletrônico
              voltada para produtos tecnológicos. Nosso objetivo é
              conectar pessoas à tecnologia por meio de uma experiência
              de compra organizada, intuitiva e confiável.
            </p>
          </div>

          <div>
            <h2>Nosso propósito</h2>
            <p>
              Facilitar o acesso à tecnologia, valorizando a qualidade,
              a praticidade e a satisfação dos nossos clientes.
            </p>
          </div>

          <div>
            <h2>Nosso compromisso</h2>
            <p>
              Trabalhar para oferecer uma navegação simples, informações
              claras sobre os produtos e atendimento com respeito e
              transparência.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default QuemSomos;