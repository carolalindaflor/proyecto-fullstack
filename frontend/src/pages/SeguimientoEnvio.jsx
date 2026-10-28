import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../config/api';

const SeguimientoEnvio = () => {
  const { id } = useParams(); // Captura el ID del pedido directamente desde la URL si existe
  const navigate = useNavigate();
  
  // ESTADOS DEL MÓDULO DE RASTREO
  const [idBusqueda, setIdBusqueda] = useState(id || '');
  const [datosPedido, setDatosPedido] = useState(null);
  const [historialLogistico, setHistorialLogistico] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [errorRastreo, setErrorRastreo] = useState('');

  // 1. FUNCIÓN ASÍNCRONA PARA CONSULTAR LA LÍNEA DE TIEMPO EN POSTGRESQL
  const consultarSeguimientoPedido = async (idPedido) => {
    if (!idPedido) return;
    setCargando(true);
    setErrorRastreo('');
    setDatosPedido(null);
    setHistorialLogistico([]);

    try {
      // Llamada al endpoint público de logística del backend
      const respuesta = await api.get(`/logistica/seguimiento/${idPedido}`);
      
      // PostgreSQL nos devuelve el pedido y su historial de movimientos
      setDatosPedido(respuesta.data.pedido[0] || respuesta.data.pedido);
      setHistorialLogistico(respuesta.data.historial || []);
    } catch (err) {
      console.error(err);
      setErrorRastreo(err.response?.data?.error || 'Não foi possível encontrar nenhum envio para o código informado.');
    } finally {
      setCargando(false);
    }
  };

  // Dispara la consulta automáticamente si el ID viaja por la URL
  useEffect(() => {
    if (id) {
      queueMicrotask(() => consultarSeguimientoPedido(id));
    }
  }, [id]);

  // Manejador del botón de búsqueda manual
  const manejarBusquedaManual = (e) => {
    e.preventDefault();
    if (!idBusqueda.trim()) return;
    navigate(`/seguimiento/${idBusqueda.trim()}`);
  };
  return (
    <div className="voke-seguimiento-wrapper">
      <div className="voke-form-title-block">
        <h2 className="voke-form-title-text">Rastreamento de Pedido Voke</h2>
        <p className="voke-form-subtitle-text">Consulte a linha do tempo e o status do despacho de suas mercadorias em tempo real.</p>
      </div>

      {/* Formulario de Búsqueda Manual */}
      <form onSubmit={manejarBusquedaManual} className="voke-dashboard-alta-categoria-form voke-rastreo-input-box">
        <input 
          type="text" 
          value={idBusqueda} 
          onChange={(e) => setIdBusqueda(e.target.value)} 
          placeholder="Digite o código do seu pedido (Ex: 5)" 
          className="voke-form-input-text" 
          required 
        />
        <button type="submit" className="voke-submit-btn-black btn-alta-dashboard" disabled={cargando}>
          {cargando ? 'Buscando...' : 'Rastrear'}
        </button>
      </form>

      {errorRastreo && <div className="voke-alerta-box voke-alerta-error">{errorRastreo}</div>}

      {/* Renderizado de Detalles del Pedido Encontrado */}
      {datosPedido && (
        <div className="voke-dashboard-seccion-bloque">
          <div className="voke-seguimiento-resumen-cabecera">
            <h3>Pedido # {datosPedido.id}</h3>
            <span className="voke-rol-pill role-admin">{datosPedido.status_envio}</span>
          </div>
          <p className="voke-notif-subtext">
            <strong>Destino:</strong> {datosPedido.direccion}, {datosPedido.ciudad} (CEP: {datosPedido.cep})
          </p>
          <p className="voke-notif-subtext">
            <strong>Data da Compra:</strong> {new Date(datosPedido.fecha_pedido).toLocaleDateString('pt-BR')}
          </p>

          {/* ================= LÍNEA DE TIEMPO INTERACTIVA ================= */}
          <h4 className="voke-form-title-subsegment voke-timeline-heading">📋 Histórico de Movimentações Logísticas</h4>
          
          <div className="voke-timeline-contenedor">
            {historialLogistico.length === 0 ? (
              <p className="voke-notif-subtext">Pedido registrado. Aguardando atualização dos operadores de estoque.</p>
            ) : (
              historialLogistico.map((mov, idx) => (
                <div key={mov.id || idx} className="voke-timeline-item">
                  <div className="voke-timeline-badge-icon">
                    {mov.estado_logistico === 'Pendiente' && '⏳'}
                    {mov.estado_logistico === 'Despachado' && '📦'}
                    {mov.estado_logistico === 'En camino' && '🚚'}
                    {mov.estado_logistico === 'Entregado' && '✅'}
                    {mov.estado_logistico === 'Devuelto' && '↩️'}
                    {mov.estado_logistico === 'No entregado' && '❌'}
                  </div>
                  <div className="voke-timeline-contenido">
                    <h5 className="voke-tarjeta-cuota-destacada">{mov.estado_logistico}</h5>
                    <p className="voke-timeline-detalles-texto">{mov.detalles}</p>
                    <span className="voke-timeline-fecha">
                      {new Date(mov.fecha_actualizacion).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
                    {/* ================= NUEVO: BOTÓN SEMÁNTICO DE REGRESO SEGURO ================= */}
          <div className="voke-seguimiento-footer-btn-box">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="voke-submit-btn-black btn-alta-dashboard voke-btn-volver-catalogo"
              title="Voltar para a página principal da loja"
            >
              ⬅️Voltar ao Catálogo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeguimientoEnvio;