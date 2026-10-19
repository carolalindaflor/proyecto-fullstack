import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../config/api';
import CheckoutPedido from '../components/CheckoutPedido';


const Carrito = () => {
  const [elementos, setElementos] = useState([]);
  const [totalGeneral, setTotalGeneral] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [notificacion, setNotificacion] = useState('');

  const obtenerCarritoDeBD = async () => {
    try {
      const token = localStorage.getItem('voke_token');
      if (!token) return setCargando(false);
      const respuesta = await api.get('/carrinhos');
      setElementos(respuesta.data.items || []);
      setTotalGeneral(respuesta.data.total || 0);
    } catch (error) {
      console.error("Erro ao carregar o carrinho:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    queueMicrotask(obtenerCarritoDeBD);
  }, []);

  const manejarEliminarProducto = async (productoId, nombreProducto) => {
    try {
      await api.delete(`/carrinhos/${productoId}`);
      setNotificacion(`❌ "${nombreProducto}" foi removido e o item retornou ao estoque.`);
      window.dispatchEvent(new Event('carrito_actualizado'));
      obtenerCarritoDeBD();
      setTimeout(() => setNotificacion(''), 4000);
    } catch (error) {
      console.error("Erro ao deletar item:", error);
    }
  };

  // SINCRONIZACIÓN ASÍNCRONA TOTAL CON EL BACKEND REFORMADO
  const manejarModificarCantidad = async (productoId, cantidadActual, nombreProducto, accion) => {
    let nuevaCantidad = accion === 'sumar' ? cantidadActual + 1 : cantidadActual - 1;

    // REGLA: Validación de cero con cuadro de confirmación para retornar stock
    if (nuevaCantidad <= 0) {
      const confirmarExcluir = window.confirm(
        `Você está prestes a reduzir a quantidade a zero. Deseja remover "${nombreProducto}" do carrinho? O produto voltará ao seu estoque respectivo.`
      );
      if (confirmarExcluir) {
        await manejarEliminarProducto(productoId, nombreProducto);
      }
      return;
    }

    try {
      // Enviamos el valor relativo (+1 o -1) al backend tolerante
      const valorCambio = accion === 'sumar' ? 1 : -1;
      
      await api.post('/carrinhos', { 
        productoId: parseInt(productoId), 
        cantidad: valorCambio 
      });
      
      // Sincroniza la burbuja numérica del Navbar de inmediato
      window.dispatchEvent(new Event('carrito_actualizado'));
      
      // Forzamos a React a leer los nuevos totales calculados en PostgreSQL
      await obtenerCarritoDeBD();
    } catch (error) {
      console.error("Erro ao alterar quantidade no carrinho:", error);
      obtenerCarritoDeBD();
    }
  };

  return (
    <div className="voke-layout-wrapper">
      <div>
        <Navbar />
        
        {notificacion && (
          <div className="voke-alerta-box voke-alerta-success voke-notif-fixed">
            {notificacion}
          </div>
        )}

        <div className="voke-cart-main-container">
          <h2 className="voke-cart-title">Seu Carrinho de Compras</h2>

          {cargando ? (
            <div className="voke-alerta-box">
              <p>Carregando itens...</p>
            </div>
          ) : elementos.length === 0 ? (
            <div className="voke-login-card-box voke-cart-empty-box">
              <p className="voke-form-subtitle-text">Seu carrinho da Voke está vazio atualmente.</p>
              <Link to="/" className="voke-submit-btn-black">Voltar às compras</Link>
            </div>
          ) : (
            <div className="voke-cart-flex-layout">
              
              {/* LISTADO DE ARTÍCULOS A LA IZQUIERDA */}
              <div className="voke-cart-items-column">
                {elementos.map((item) => (
                  <div key={item.producto_id} className="voke-product-card voke-product-card-horizontal">
                    
                    {/* CONTENEDOR DE IMAGEN AL TAMAÑO DEL CATÁLOGO */}
                    <div className="voke-cart-item-image-frame">
                      <img src={item.imagen_url && item.imagen_url.length > 0 ? item.imagen_url : 'https://placeholder.com'} alt={item.nombre} className="voke-tarjeta-img" />
                    </div>

                    {/* DESCRIPCIÓN Y SELECTORES COMPLETAMENTE ENLAZADOS */}
                    <div className="voke-cart-item-details">
                      <h4 className="voke-tarjeta-titulo voke-cart-item-title-fixed">
                        {item.nombre}
                      </h4>
                      
                      <div className="voke-cart-quantity-row">
                        <span className="voke-form-subtitle-text">Quantidade:</span>
                        <div className="voke-cart-quantity-selector">
                          <button 
                            type="button" 
                            onClick={() => manejarModificarCantidad(item.producto_id, item.cantidad, item.nombre, 'restar')}
                            className="voke-cart-btn-counter"
                          >
                            -
                          </button>
                          <span className="voke-cart-number-display">
                            {item.cantidad}
                          </span>
                          <button 
                            type="button" 
                            onClick={() => manejarModificarCantidad(item.producto_id, item.cantidad, item.nombre, 'sumar')}
                            className="voke-cart-btn-counter"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <p className="voke-tarjeta-precio-pix">R\$ {parseFloat(item.precio).toFixed(2)}</p>
                    </div>
                    
                    {/* BOTÓN TEXTUAL EXCLUIR */}
                    <div>
                      <button 
                        type="button" 
                        onClick={() => manejarEliminarProducto(item.producto_id, item.nombre)} 
                        className="voke-cart-btn-excluir"
                        title="Excluir produto"
                      >
                        🗑️ Excluir
                      </button>
                    </div>

                  </div>
                ))}
              </div>

              {/* CUADRO DE RESUMEN DE PAGO A LA DERECHA
              <div className="voke-login-card-box voke-cart-summary-column">
                <h3 className="voke-form-title-text">Resumo do Pedido</h3>
                <div className="voke-cart-summary-row"><span>Subtotal:</span><span className="voke-form-label">R\$ {totalGeneral.toFixed(2)}</span></div>
                <div className="voke-cart-summary-row"><span>Frete:</span><span className="voke-tarjeta-envio">Grátis</span></div>
                <div className="voke-cart-summary-total-row"><span>Total:</span><span>R\$ {totalGeneral.toFixed(2)}</span></div>
                <button type="button" onClick={manejarCheckoutFluido} className="voke-submit-btn-black">Finalizar Compra (Pix)</button>
              </div> */}
              {/* --- COLUMNA DE RESUMEN Y PASARELA DE PAGOS TOTALMENTE INTEGRADA --- */}
              <div className="voke-login-card-box voke-cart-summary-column">
                <h3 className="voke-form-title-text">Resumo do Pedido</h3>
                
                <div className="voke-cart-summary-row">
                  <span>Subtotal:</span>
                  <span className="voke-form-label">R$ {totalGeneral.toFixed(2)}</span>
                </div>
                
                <div className="voke-cart-summary-row">
                  <span>Frete:</span>
                  <span className="voke-tarjeta-envio">Grátis</span>
                </div>
                
                <div className="voke-cart-summary-total-row">
                  <span>Total:</span>
                  <span>R$ {totalGeneral.toFixed(2)}</span>
                </div>

                {/* FORMULARIO AVANZADO DE PAGO CON VERIFICACIÓN SEGURA DE ARREGLOS */}
                                {/* FORMULARIO AVANZADO DE PAGO, LOGÍSTICA Y CONTROL DE STOCK */}
                 {/* FORMULARIO AVANZADO DE PAGO, LOGÍSTICA Y CONTROL DE STOCK */}
                <CheckoutPedido 
                  totalOriginal={totalGeneral} 
                  
                  /* SINCRONIZACIÓN DE VARIABLES REALES: Pasamos tu estado exacto */
                  itemsCarrito={elementos} 
                  
                  alCompletarPedido={() => {
                    /* LIMPIEZA ATÓMICA DE TU COMPONENTE: Vaciamos el estado real */
                    setElementos([]);
                  }} 
                />

              </div>


            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Carrito;