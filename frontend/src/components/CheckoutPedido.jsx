import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';

const CheckoutPedido = ({ totalOriginal, itemsCarrito, alCompletarPedido }) => {
  const navigate = useNavigate();
  
  // ESTADOS DE ENVÍO / LOGÍSTICA
  const [cep, setCep] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');

  // ESTADOS DE PASARELA DE PAGO
  const [metodoPago, setMetodoPago] = useState('Pix'); // 'Pix', 'Credito', 'Debito'
  const [cuotas, setCuotas] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [errorCheckout, setErrorCheckout] = useState('');

  // DATOS DE TARJETA SIMULADOS
  const [numeroTarjeta, setNumeroTarjeta] = useState('');
  const [nombreTarjeta, setNombreTarjeta] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [cvv, setCvv] = useState('');

  // CÁLCULO DINÁMICO DE VALOR POR PARCELA / CUOTA
  const totalFinal = metodoPago === 'Pix' ? totalOriginal * 0.95 : totalOriginal;
  const cambiarMetodoPago = metodo => {
    setMetodoPago(metodo);
    if (metodo === 'Pix' || metodo === 'Debito') setCuotas(1);
  };
  // ==========================================
  // PROCESAMIENTO DE TRANSACCIÓN Y LOGÍSTICA
  // ==========================================
  const procesarFinalizacionCompra = async (e) => {
    e.preventDefault();
    setErrorCheckout('');
    setCargando(true);

    // 1. VALIDACIÓN ESTRICTA DE LOGÍSTICA
    if (!cep.trim() || !direccion.trim() || !ciudad.trim()) {
      setCargando(false);
      return setErrorCheckout('Por favor, suministre el CEP, la dirección de envío y la ciudad.');
    }

    // 2. VALIDACIÓN DE PASARELA DE TARJETAS
    if (metodoPago !== 'Pix') {
      if (!numeroTarjeta || !nombreTarjeta || !vencimiento || !cvv) {
        setCargando(false);
        return setErrorCheckout('Por favor, complete todos los campos de la tarjeta de pago.');
      }
    }

    try {
      const token = localStorage.getItem('voke_token');
      const usuarioGuardado = localStorage.getItem('voke_usuario');
      const user = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;

      if (!token || !user) {
        setCargando(false);
        return setErrorCheckout('Sesión inválida. Por favor, vuelva a iniciar sesión.');
      }
     // MAPEO SEGURO DE ITEMS: Transforma los productos del estado a la estructura que espera PostgreSQL
      const productosProcesados = (itemsCarrito || []).map(item => ({
        producto_id: item.producto_id || item.id, // Captura el ID real del producto de la BD
        cantidad: item.cantidad || 1,             // Captura las unidades seleccionadas
        precio: item.precio                       // Guarda el precio histórico
      }));
      // 3. ESTRUCTURA DE LA ORDEN COMERCIAL PARA EL BACKEND
      // SOLUCIÓN ESTRUCTURAL: Mapeo unificado con la pasarela financiera del Backend
//ultima actualizacion
      // SOLUCIÓN DE REQ.BODY: Mapeo plano exacto para la validación de pagoController.js
      const datosPedido = {
        items: productosProcesados,
        total: totalFinal,   // Monto total con o sin descuento aplicado
        metodo_pago: metodoPago, // Coincide con tu desestructuración
        cuotas: parseInt(cuotas),
        
        // CORRECCIÓN CRUCIAL: Enviamos las variables sueltas en la raíz del cuerpo HTTP
        cep: cep.trim(),
        direccion: direccion.trim(),
        ciudad: ciudad.trim(),
        
        logistica: {
          cep: cep.trim(),
          direccion: direccion.trim(),
          ciudad: ciudad.trim()
        },
        detallesTarjeta: {
          numeroTarjeta: numeroTarjeta.trim(),
          nombreTarjeta: nombreTarjeta.trim().toUpperCase(),
          vencimiento: vencimiento.trim(),
          cvv: cvv.trim()
        }
      };

      // 🚀 MIGRADO A AXIOS (POST): Se comunica dinámicamente con tu servidor en Render o Local
      const response = await api.post('/pagos/finalizar', datosPedido);
      const data = response.data; // En Axios la respuesta del controlador viaja en la propiedad 'data'
      // 4. PETICIÓN HTTP POST A LA API DE PAGOS / PEDIDOS
      // const respuesta = await fetch('http://localhost:3001/api/pagos/finalizar', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${token}`
      //   },
      //   body: JSON.stringify(datosPedido)
      // });

      //const data = await respuesta.json();

      // if (!respuesta.ok) {
      //   throw new Error(data.error || 'Ocurrió un error al procesar el pago o descontar el stock.');
      // }

      // 5. SIMULACIÓN DE RECIBO DIGITAL POR CORREO ELECTRÓNICO
      alert(`
        📥 ¡PAGO PROCESADO CON ÉXITO!
        
        Estimado/a cliente, se ha generado su recibo formal. 
        Un correo de confirmación ha sido enviado a: ${user.email || 'su dirección registrada'}.
        
        📄 DETALLES DEL RECIBO:
        - Pedido ID: #${data.pedidoId || '001'}
        - Total Pagado: R$ ${totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        - Vía de Pago: ${metodoPago} ${metodoPago === 'Credito' ? `(en \${cuotas} cuotas)` : ''}
        - Despacho: Su paquete ha sido registrado con estatus [Pendiente] y se enviará a ${direccion}, ${ciudad}.
      `);

      // 6. NOTIFICAR AL CARRITO PARA LIMPIAR LA VISTA Y REDIRIGIR
      // 6. LIMPIEZA INMEDIATA Y REDIRECCIÓN
      if (typeof alCompletarPedido === 'function') {
        alCompletarPedido(); // <-- Esta es la única línea que debe llamarse aquí
      }
      
      window.dispatchEvent(new Event('carrito_actualizado'));
      navigate('/'); 

    } catch (err) {
      setErrorCheckout(err.message);
    } finally {
      setCargando(false);
    }
  };
  return (
    <div className="voke-checkout-box-maestra">
      <div className="voke-form-title-block">
        <h3 className="voke-form-title-text">Finalizar Compra y Despacho</h3>
        <p className="voke-form-subtitle-text">Complete sus datos de envío y seleccione el método de pago.</p>
      </div>

      {errorCheckout && (
        <div className="voke-alerta-box voke-alerta-error">
          {errorCheckout}
        </div>
      )}

      <form onSubmit={procesarFinalizacionCompra}>
        
        {/* ================= SECCIÓN 1: DATOS DE LOGÍSTICA / ENVÍO ================= */}
        <div className="voke-checkout-section-segment">
          <h4 className="voke-form-title-subsegment">1. Dirección de Despacho</h4>
          
          <div className="voke-form-group-block">
            <label className="voke-form-label">CEP (Código Postal) *</label>
            <input 
              type="text" 
              value={cep} 
              onChange={(e) => setCep(e.target.value)} 
              placeholder="00000-000" 
              className="voke-form-input-text" 
              required 
            />
          </div>

          <div className="voke-form-group-block">
            <label className="voke-form-label">Dirección de Envío *</label>
            <input 
              type="text" 
              value={direccion} 
              onChange={(e) => setDireccion(e.target.value)} 
              placeholder="Calle, Avenida, Número, Apartamento" 
              className="voke-form-input-text" 
              required 
            />
          </div>

          <div className="voke-form-group-block">
            <label className="voke-form-label">Ciudad *</label>
            <input 
              type="text" 
              value={ciudad} 
              onChange={(e) => setCiudad(e.target.value)} 
              placeholder="Ej: São Paulo, Curitiba" 
              className="voke-form-input-text" 
              required 
            />
          </div>
        </div>

        {/* ================= SECCIÓN 2: PASARELA DE PAGOS SELECCIÓN ================= */}
        <div className="voke-checkout-section-segment voke-profile-section-form-spaced">
          <h4 className="voke-form-title-subsegment">2. Método de Pago</h4>
          
          <div className="voke-radio-group voke-form-group-block-spaced">
            <label className="voke-radio-label">
              <input 
                type="radio" 
                name="metodoPago" 
                checked={metodoPago === 'Pix'} 
                onChange={() => cambiarMetodoPago('Pix')}
              /> Pix (5% de Descuento)
            </label>
            <label className="voke-radio-label">
              <input 
                type="radio" 
                name="metodoPago" 
                checked={metodoPago === 'Credito'} 
                onChange={() => cambiarMetodoPago('Credito')}
              /> Tarjeta de Crédito
            </label>
            <label className="voke-radio-label">
              <input 
                type="radio" 
                name="metodoPago" 
                checked={metodoPago === 'Debito'} 
                onChange={() => cambiarMetodoPago('Debito')}
              /> Tarjeta de Débito
            </label>
          </div>

          {/* MENÚ DE CUOTAS DINÁMICAS (SOLO PARA TARJETA DE CRÉDITO) */}
          {metodoPago === 'Credito' && (
            <div className="voke-form-group-block">
              <label className="voke-form-label">Número de Cuotas / Parcelas</label>
              <select 
                value={cuotas} 
                onChange={(e) => setCuotas(parseInt(e.target.value))} 
                className="voke-form-input-text"
              >
                {[...Array(10)].map((_, index) => {
                  const numCuota = index + 1;
                  const valorFraccionado = totalFinal / numCuota;
                  return (
                    <option key={numCuota} value={numCuota}>
                      {numCuota}x de R\$ {valorFraccionado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sem juros
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* INPUTS DE TARJETA COMPLEMENTARIOS (CRÉDITO Y DÉBITO) */}
          {metodoPago !== 'Pix' && (
            <div className="voke-tarjeta-campos-container voke-crud-seguridad-box">
              <div className="voke-form-group-block">
                <label className="voke-form-label">Número de la Tarjeta *</label>
                <input 
                  type="text" 
                  value={numeroTarjeta} 
                  onChange={(e) => setNumeroTarjeta(e.target.value)} 
                  placeholder="0000 0000 0000 0000" 
                  className="voke-form-input-text" 
                />
              </div>
              <div className="voke-form-group-block">
                <label className="voke-form-label">Nombre del Titular (como impreso) *</label>
                <input 
                  type="text" 
                  value={nombreTarjeta} 
                  onChange={(e) => setNombreTarjeta(e.target.value)} 
                  placeholder="JUAN A PEREZ" 
                  className="voke-form-input-text" 
                />
              </div>
              <div className="voke-buttons-flex">
                <div className="voke-form-group-block">
                  <label className="voke-form-label">Vencimiento *</label>
                  <input 
                    type="text" 
                    value={vencimiento} 
                    onChange={(e) => setVencimiento(e.target.value)} 
                    placeholder="MM/AA" 
                    className="voke-form-input-text" 
                  />
                </div>
                <div className="voke-form-group-block">
                  <label className="voke-form-label">CVV *</label>
                  <input 
                    type="password" 
                    value={cvv} 
                    onChange={(e) => setCvv(e.target.value)} 
                    placeholder="000" 
                    className="voke-form-input-text" 
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================= RESUMEN DE COBRO Y SUBMIT ================= */}
        <div className="voke-checkout-resumen-seccion voke-login-footer-info">
          <div className="voke-resumen-fila-precio">
            <span className="voke-form-label">Total a pagar:</span>
            <span className="voke-checkout-total-destacado">
              R\$ {totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          {metodoPago === 'Pix' && (
            <p className="voke-notif-subtext voke-descuento-mensaje-verde">
              ✓ ¡Ahorro del 5% aplicado vía PIX!
            </p>
          )}

          <button 
            type="submit" 
            disabled={cargando} 
            className="voke-submit-btn-black voke-btn-finalizar-checkout"
          >
            {cargando ? 'Procesando transacción...' : `Finalizar Compra (${metodoPago})`}
          </button>
        </div>

      </form>
    </div>
  );
};

export default CheckoutPedido;