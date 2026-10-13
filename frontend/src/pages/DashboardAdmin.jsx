import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';

const DashboardAdmin = () => {
  const navigate = useNavigate();
  const [seccionActiva, setSeccionActiva] = useState('resumen');
  // CONFIGURACIÓN DE ESTADOS REALES UNIFICADOS
  const [metricas, setMetricas] = useState(null);               
  const [categorias, setCategorias] = useState([]);             
  const [usuarios, setUsuarios] = useState([]);                 
  const [pedidos, setPedidos] = useState([]); 
  const [productos, setProductos] = useState([]);
  const [productoEditandoId, setProductoEditandoId] = useState(null);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: '',
    marca: '',
    descripcion: '',
    precio: '',
    stock: '0',
    categoriaId: '',
    imagenUrl: ''
  });
  const [estadoVistaPrevia, setEstadoVistaPrevia] = useState('');
  const [cargando, setCargando] = useState(true);
  const [errorDashboard, setErrorDashboard] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  // 1. CARGA INICIAL COMPLETA (Promise.all con 4 consultas en paralelo)
  const cargarInformacionDashboard = async () => {
    try {
      const token = localStorage.getItem('voke_token');
      const configuracion = { headers: { 'Authorization': `Bearer ${token}` } };

      const [resAnalitica, resCategorias, resUsuarios, resPedidos, resProductos] = await Promise.all([
        api.get('/dashboard/analitica', configuracion),
        api.get('/dashboard/categorias', configuracion),
        api.get('/dashboard/usuarios', configuracion),
        api.get('/logistica/pedidos-todos', configuracion),
        api.get('/produtos')
      ]);

      setMetricas(resAnalitica.data);
      setCategorias(resCategorias.data);
      setUsuarios(resUsuarios.data);
      setPedidos(resPedidos.data);
      setProductos(resProductos.data);
    } catch (err) {
      console.error(err);
      setErrorDashboard(err.response?.data?.error || 'Erro ao carregar dados do painel analítico.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => cargarInformacionDashboard());
  }, []);
  // 2. FUNCIÓN PARA ALTERAR EL ESTADO LOGÍSTICO CON UN CLIC (PUT)
  const manejarCambioEstadoPedido = async (idPedido, nuevoEstado) => {
    setErrorDashboard('');
    setMensajeExito('');
    try {
      const token = localStorage.getItem('voke_token');
      const configuracion = { headers: { 'Authorization': `Bearer ${token}` } };
      
      const cuerpo = { 
        nuevoEstado, 
        detallesHistorial: `O pedido foi movido para o status [${nuevoEstado}] pelo administrador.` 
      };

      const respuesta = await api.put(`/logistica/actualizar-estado/${idPedido}`, cuerpo, configuracion);
      setMensajeExito(respuesta.data.mensaje || '¡Estado actualizado con éxito!');
      cargarInformacionDashboard(); // Refresca las barras de colores en vivo al instante
    } catch (err) {
      setErrorDashboard(err.response?.data?.error || 'Erro ao atualizar estado logístico.');
    }
  };

  // 3. CONTROL DE ROLES: ASIGNACIÓN EN CALIENTE (PUT)
  const manejarCambioDeRol = async (idUsuario, rolActual) => {
    const nuevoPerfil = rolActual === 'admin' ? 'cliente' : 'admin';
    const mensajeConfirmacion = nuevoPerfil === 'admin' 
      ? '¿Está seguro de ascender a este usuario a rango de Administrador Supremo Voke?' 
      : '¿Está seguro de remover los permisos de administrador y degradarlo a cliente común?';
      
    if (!window.confirm(mensajeConfirmacion)) return;
    setErrorDashboard('');
    setMensajeExito('');

    try {
      const token = localStorage.getItem('voke_token');
      const configuracion = { headers: { 'Authorization': `Bearer ${token}` } };

      const respuesta = await api.put(`/dashboard/usuarios/rol/${idUsuario}`, { nuevoPerfil }, configuracion);
      setMensajeExito(respuesta.data.mensaje || '¡Rol actualizado con éxito en PostgreSQL!');
      cargarInformacionDashboard(); 
    } catch (err) {
      setErrorDashboard(err.response?.data?.error || 'Erro al intentar modificar el rol de seguridad.');
    }
  };

  // 4. CONTROL ABM: AGREGAR CATEGORÍA NUEVA (POST)
  const manejarCrearCategoria = async (e) => {
    e.preventDefault();
    setErrorDashboard('');
    setMensajeExito('');
    if (!nuevaCategoria.trim()) return;

    try {
      const token = localStorage.getItem('voke_token');
      const configuracion = { headers: { 'Authorization': `Bearer ${token}` } };

      await api.post('/dashboard/categorias', { nombre: nuevaCategoria }, configuracion);
      setNuevaCategoria('');
      setMensajeExito('¡Categoría agregada con éxito al catálogo invisible!');
      cargarInformacionDashboard(); 
    } catch (err) {
      setErrorDashboard(err.response?.data?.error || 'Erro ao criar categoria.');
    }
  };

  const manejarCrearProducto = async (e) => {
    e.preventDefault();
    setErrorDashboard('');
    setMensajeExito('');

    try {
      const token = localStorage.getItem('voke_token');
      const configuracion = { headers: { Authorization: `Bearer ${token}` } };
      const { nombre, marca, descripcion, precio, stock, categoriaId, imagenUrl } = nuevoProducto;

      const datosProducto = {
        nombre: nombre.trim(),
        marca: marca.trim(),
        descripcion: descripcion.trim(),
        precio: Number(precio),
        stock: Number(stock),
        categoriaId: Number(categoriaId),
        imagenes: [imagenUrl.trim()]
      };

      if (productoEditandoId) {
        await api.put(`/produtos/${productoEditandoId}`, datosProducto, configuracion);
      } else {
        await api.post('/produtos', datosProducto, configuracion);
      }

      setNuevoProducto({ nombre: '', marca: '', descripcion: '', precio: '', stock: '0', categoriaId: '', imagenUrl: '' });
      setProductoEditandoId(null);
      setEstadoVistaPrevia('');
      setMensajeExito(productoEditandoId ? 'Producto actualizado correctamente.' : 'Producto agregado al catálogo correctamente.');
      await cargarInformacionDashboard();
    } catch (err) {
      setErrorDashboard(err.response?.data?.error || 'No se pudo agregar el producto.');
    }
  };

  const manejarEditarProducto = producto => {
    setSeccionActiva('alta-producto');
    setProductoEditandoId(producto.id);
    setNuevoProducto({
      nombre: producto.nombre || '',
      marca: producto.marca || '',
      descripcion: producto.descripcion || '',
      precio: String(producto.precio ?? ''),
      stock: String(producto.stock ?? 0),
      categoriaId: String(producto.categoria_id ?? ''),
      imagenUrl: producto.imagenes?.[0] || ''
    });
    setEstadoVistaPrevia(producto.imagenes?.[0] ? 'cargando' : '');
    setErrorDashboard('');
    setMensajeExito('');
    window.requestAnimationFrame(() => {
      document.getElementById('dashboard-product-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const manejarCancelarEdicionProducto = () => {
    setProductoEditandoId(null);
    setNuevoProducto({ nombre: '', marca: '', descripcion: '', precio: '', stock: '0', categoriaId: '', imagenUrl: '' });
    setEstadoVistaPrevia('');
  };

  const manejarEliminarProducto = async producto => {
    const usos = Number(producto.usos_carrito || 0) + Number(producto.usos_pedidos || 0);
    if (usos > 0) return;
    if (!window.confirm(`¿Eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`)) return;

    setErrorDashboard('');
    setMensajeExito('');
    try {
      const token = localStorage.getItem('voke_token');
      await api.delete(`/produtos/${producto.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMensajeExito('Producto eliminado del catálogo.');
      await cargarInformacionDashboard();
    } catch (err) {
      setErrorDashboard(err.response?.data?.error || 'No se pudo eliminar el producto.');
    }
  };

  const manejarCerrarSesion = () => {
    localStorage.clear();
    window.dispatchEvent(new Event('carrito_actualizado'));
    navigate('/login', { replace: true });
  };

  // 5. CONTROL ABM: ELIMINAR CATEGORÍA VALIDADA EN STOCK CERO (DELETE)
  const manejarEliminarCategoria = async (idCategoria) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta categoría de la base de datos?')) return;
    setErrorDashboard('');
    setMensajeExito('');

    try {
      const token = localStorage.getItem('voke_token');
      const configuracion = { headers: { 'Authorization': `Bearer ${token}` } };

      await api.delete(`/dashboard/categorias/${idCategoria}`, configuracion);
      setMensajeExito('¡Categoría removida del catálogo de forma exitosa!');
      cargarInformacionDashboard();
    } catch (err) {
      setErrorDashboard(err.response?.data?.error || 'Erro ao deletar categoria.');
    }
  };

  if (cargando) {
    return <div className="voke-catalogo-cargando-box"><p>Cargando métricas de administración corporativa...</p></div>;
  }

  // Saneamiento seguro de datos analíticos para la desestructuración de Axios
  const logisticaData = metricas && metricas.logistica ? metricas.logistica : {
    pendientes: 0,
    despachados: 0,
    en_camino: 0,
    entregados: 0,
    devueltos: 0,
    no_entregados: 0
  };
  const unidadesTotales = productos.reduce((total, producto) => total + Number(producto.stock || 0), 0);
  const productosStockBajo = productos.filter(producto => Number(producto.stock || 0) <= 5);
  const pedidosPendientes = pedidos.filter(pedido => !['Entregado', 'Devuelto', 'No entregado'].includes(pedido.status_envio));
  const secciones = [
    { id: 'resumen', icono: '▦', nombre: 'Resumen' },
    { id: 'envios', icono: '◷', nombre: 'Monitoreo de envíos', contador: logisticaData.en_camino },
    { id: 'pedidos', icono: '☷', nombre: 'Pedidos y despachos', contador: pedidosPendientes.length },
    { id: 'inventario', icono: '▤', nombre: 'Inventario y alertas', contador: productosStockBajo.length },
    { id: 'alta-producto', icono: '+', nombre: 'Agregar producto' },
    { id: 'productos', icono: '▣', nombre: 'Administrar productos' },
    { id: 'categorias', icono: '⌘', nombre: 'Categorías' },
    { id: 'personal', icono: '♙', nombre: 'Personal y roles' }
  ];
  return (
    <div className="voke-dashboard-wrapper-principal">
      <div className="voke-dashboard-heading-row">
        <div className="voke-form-title-block">
          <p className="voke-dashboard-eyebrow">VOKE BRASIL / ADMINISTRACIÓN</p>
          <h2 className="voke-form-title-text">{secciones.find(seccion => seccion.id === seccionActiva)?.nombre || 'Resumen'}</h2>
          <p className="voke-form-subtitle-text">Operación de tienda y control de inventario</p>
        </div>
      </div>

      <div className="voke-dashboard-layout">
        <aside className="voke-dashboard-sidebar" aria-label="Navegación administrativa">
          <p className="voke-dashboard-sidebar-label">GESTIÓN</p>
          <nav className="voke-dashboard-nav">
            {secciones.map(seccion => (
              <button
                type="button"
                key={seccion.id}
                className={`voke-dashboard-nav-item ${seccionActiva === seccion.id ? 'is-active' : ''}`}
                onClick={() => setSeccionActiva(seccion.id)}
                aria-current={seccionActiva === seccion.id ? 'page' : undefined}
              >
                <span className="voke-dashboard-nav-icon" aria-hidden="true">{seccion.icono}</span>
                <span className="voke-dashboard-nav-name">{seccion.nombre}</span>
                {seccion.contador > 0 && <span className="voke-dashboard-nav-count">{seccion.contador}</span>}
              </button>
            ))}
          </nav>
          <div className="voke-dashboard-sidebar-footer">
            <span className="voke-dashboard-status-dot" aria-hidden="true" />
            <span>Panel conectado</span>
          </div>
          <button type="button" className="voke-dashboard-logout" onClick={manejarCerrarSesion}>
            <span aria-hidden="true">↪</span> Salir del dashboard
          </button>
        </aside>

        <main className="voke-dashboard-main-content">
          {errorDashboard && <div className="voke-alerta-box voke-alerta-error">{errorDashboard}</div>}
          {mensajeExito && <div className="voke-alerta-box voke-alerta-success">{mensajeExito}</div>}

          {seccionActiva === 'resumen' && (
            <section className="voke-dashboard-view" aria-labelledby="dashboard-summary-title">
              <div className="voke-dashboard-view-heading">
                <div>
                  <h3 id="dashboard-summary-title">Resumen de la tienda</h3>
                  <p>Indicadores principales y actividad reciente.</p>
                </div>
                <span className="voke-dashboard-updated">Datos actuales</span>
              </div>
              <div className="voke-dashboard-summary-grid">
                <article className="voke-dashboard-summary-item summary-sales">
                  <span className="voke-dashboard-summary-label">Ventas aprobadas</span>
                  <strong>R$ {Number(metricas?.totalVentas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  <span className="voke-dashboard-summary-note">Acumulado registrado</span>
                </article>
                <article className="voke-dashboard-summary-item">
                  <span className="voke-dashboard-summary-label">Pedidos registrados</span>
                  <strong>{pedidos.length}</strong>
                  <span className="voke-dashboard-summary-note">{pedidosPendientes.length} requieren seguimiento</span>
                </article>
                <article className="voke-dashboard-summary-item">
                  <span className="voke-dashboard-summary-label">Unidades en stock</span>
                  <strong>{unidadesTotales.toLocaleString('pt-BR')}</strong>
                  <span className="voke-dashboard-summary-note">En {productos.length} productos</span>
                </article>
                <article className={`voke-dashboard-summary-item ${productosStockBajo.length ? 'summary-warning' : ''}`}>
                  <span className="voke-dashboard-summary-label">Alertas de inventario</span>
                  <strong>{productosStockBajo.length}</strong>
                  <span className="voke-dashboard-summary-note">Productos con 5 unidades o menos</span>
                </article>
              </div>

              <section className="voke-dashboard-recent-section">
                <div className="voke-dashboard-view-heading">
                  <div>
                    <h3>Pedidos recientes</h3>
                    <p>Últimos movimientos registrados en la tienda.</p>
                  </div>
                  <button type="button" className="voke-dashboard-text-action" onClick={() => setSeccionActiva('pedidos')}>
                    Ver pedidos <span aria-hidden="true">→</span>
                  </button>
                </div>
                <div className="voke-dashboard-recent-list">
                  {pedidos.slice(0, 5).map(pedido => (
                    <div className="voke-dashboard-recent-row" key={pedido.id}>
                      <span className="voke-dashboard-recent-id">#{pedido.id}</span>
                      <span className="voke-dashboard-recent-customer">{pedido.nome_completo || 'Cliente'}</span>
                      <span className="voke-dashboard-recent-city">{pedido.ciudad || 'Sin destino'}</span>
                      <span className={`voke-stock-alerta-pill ${pedido.status_envio === 'Entregado' ? 'pill-optimo' : (['Devuelto', 'No entregado'].includes(pedido.status_envio) ? 'pill-critico' : 'role-admin')}`}>
                        {pedido.status_envio}
                      </span>
                      <strong>R$ {Number(pedido.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  ))}
                  {pedidos.length === 0 && <p className="voke-dashboard-empty-state">Todavía no hay pedidos para mostrar.</p>}
                </div>
              </section>
            </section>
          )}

          {seccionActiva === 'envios' && (
            <section className="voke-dashboard-view">
              <div className="voke-dashboard-view-heading">
                <div><h3>Monitoreo de envíos</h3><p>Distribución actual de estados logísticos.</p></div>
              </div>
              <div className="voke-dashboard-seccion-bloque">
                <div className="voke-dashboard-grid-logistica">
                  <div className="voke-logistica-badge-item status-pendiente"><span>Pendientes:</span><strong>{logisticaData.pendientes}</strong></div>
                  <div className="voke-logistica-badge-item status-despachado"><span>Despachados:</span><strong>{logisticaData.despachados}</strong></div>
                  <div className="voke-logistica-badge-item status-camino"><span>En camino:</span><strong>{logisticaData.en_camino}</strong></div>
                  <div className="voke-logistica-badge-item status-entregado"><span>Entregados:</span><strong>{logisticaData.entregados}</strong></div>
                  <div className="voke-logistica-badge-item status-devuelto"><span>Devueltos:</span><strong>{logisticaData.devueltos}</strong></div>
                  <div className="voke-logistica-badge-item status-no-entregado"><span>No entregados:</span><strong>{logisticaData.no_entregados}</strong></div>
                </div>
              </div>
            </section>
          )}

      {/* ================= SECCIÓN INTERACTIVA: GESTIÓN DE ÓRDENES ================= */}
      {seccionActiva === 'pedidos' && (
      <section className="voke-dashboard-view">
      <div className="voke-dashboard-view-heading"><div><h3>Pedidos y despachos</h3><p>Consulta cada orden y actualiza su estado logístico.</p></div></div>
      <div className="voke-dashboard-seccion-bloque voke-profile-section-form-spaced">
        <h3 className="voke-form-title-subsegment">📦 Gestión de Órdenes y Control de Despachos en un Clic</h3>
        <p className="voke-notif-subtext">Modifique el estado logístico de los pedidos para disparar las actualizaciones en las barras y notificar al cliente.</p>
        
        <div className="voke-dashboard-tabla-contenedor">
          <table className="voke-dashboard-tabla">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Destino</th>
                <th>Total</th>
                <th>Estado Pago</th>
                <th>Estatus Envío Actual</th>
                <th>Acción Operativa</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((ped) => (
                <tr key={ped.id}>
                  <td><strong>#{ped.id}</strong></td>
                  <td>{ped.nome_completo}</td>
                  <td>{ped.ciudad}</td>
                  <td className="voke-tarjeta-cuota-destacada">R\$ {parseFloat(ped.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td>
                    <span className={`voke-stock-alerta-pill ${ped.estado_pago === 'Pago Aprovado' ? 'pill-optimo' : 'pill-critico'}`}>
                      {ped.estado_pago}
                    </span>
                  </td>
                  <td>
                    <span className="voke-rol-pill role-admin">
                      {ped.status_envio}
                    </span>
                  </td>
                  <td>
                    <select
                      value={ped.status_envio}
                      onChange={(e) => manejarCambioEstadoPedido(ped.id, e.target.value)}
                      className="voke-form-input-text voke-select-logistica-dashboard"
                    >
                      <option value="Pendiente">⏳ Pendiente</option>
                      <option value="Despachado">📦 Despachado</option>
                      <option value="En camino">🚚 En camino</option>
                      <option value="Entregado">✅ Entregado</option>
                      <option value="Devuelto">↩️ Devuelto</option>
                      <option value="No entregado">❌ No entregado</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </section>
      )}
      {/* ================= SECCIÓN 3: MEDICIÓN DE STOCK E INVENTARIO ================= */}
      {seccionActiva === 'inventario' && (
      <section className="voke-dashboard-view">
      <div className="voke-dashboard-view-heading"><div><h3>Inventario y alertas</h3><p>{productosStockBajo.length} productos requieren revisión de stock.</p></div></div>
      <div className="voke-dashboard-seccion-bloque voke-profile-section-form-spaced">
        <h3 className="voke-form-title-subsegment">📊 Inventario y Alertas de Almacén</h3>
        <div className="voke-dashboard-tabla-contenedor">
          <table className="voke-dashboard-tabla">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Precio Base</th>
                <th>Existencias en Stock</th>
                <th>Estatus Almacén</th>
              </tr>
            </thead>
            <tbody>
              {metricas?.inventarioStock?.map((prod, idx) => (
                <tr key={idx}>
                  <td>{prod.nombre}</td>
                  <td>R\$ {parseFloat(prod.precio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="voke-tarjeta-cuota-destacada">{prod.stock} un.</td>
                  <td>
                    <span className={`voke-stock-alerta-pill ${prod.stock <= 5 ? 'pill-critico' : 'pill-optimo'}`}>
                      {prod.stock === 0 ? 'Agotado Crítico' : (prod.stock <= 5 ? 'Abastecimiento Bajo' : 'Stock Óptimo')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </section>
      )}

      {/* ================= SECCIÓN: ALTA DE PRODUCTOS ================= */}
      {seccionActiva === 'alta-producto' && (
      <section className="voke-dashboard-view">
      <div className="voke-dashboard-view-heading"><div><h3>{productoEditandoId ? 'Editar producto' : 'Agregar producto'}</h3><p>Completa los datos comerciales e inventario del artículo.</p></div></div>
      <div className="voke-dashboard-seccion-bloque voke-profile-section-form-spaced">
        <h3 className="voke-form-title-subsegment">
          {productoEditandoId ? `Editar producto #${productoEditandoId}` : 'Agregar producto al catálogo'}
        </h3>
        <form id="dashboard-product-form" onSubmit={manejarCrearProducto} className="voke-dashboard-product-form">
          <div className="voke-dashboard-product-fields">
            <div className="voke-form-group-block">
              <label className="voke-form-label" htmlFor="producto-nombre">Nombre del producto</label>
              <input
                id="producto-nombre"
                className="voke-form-input-text"
                value={nuevoProducto.nombre}
                onChange={event => setNuevoProducto(actual => ({ ...actual, nombre: event.target.value }))}
                required
              />
            </div>
            <div className="voke-form-group-block">
              <label className="voke-form-label" htmlFor="producto-marca">Marca</label>
              <input
                id="producto-marca"
                className="voke-form-input-text"
                value={nuevoProducto.marca}
                onChange={event => setNuevoProducto(actual => ({ ...actual, marca: event.target.value }))}
                placeholder="Ej.: Dell, HP, Lenovo"
                required
              />
            </div>
            <div className="voke-form-group-block voke-dashboard-product-description">
              <label className="voke-form-label" htmlFor="producto-descripcion">Descripción</label>
              <textarea
                id="producto-descripcion"
                className="voke-form-input-text voke-dashboard-product-textarea"
                value={nuevoProducto.descripcion}
                onChange={event => setNuevoProducto(actual => ({ ...actual, descripcion: event.target.value }))}
                rows="3"
              />
            </div>
            <div className="voke-form-group-block">
              <label className="voke-form-label" htmlFor="producto-precio">Precio (R$)</label>
              <input
                id="producto-precio"
                className="voke-form-input-text"
                type="number"
                min="0.01"
                step="0.01"
                value={nuevoProducto.precio}
                onChange={event => setNuevoProducto(actual => ({ ...actual, precio: event.target.value }))}
                required
              />
            </div>
            <div className="voke-form-group-block">
              <label className="voke-form-label" htmlFor="producto-stock">Stock inicial</label>
              <input
                id="producto-stock"
                className="voke-form-input-text"
                type="number"
                min="0"
                step="1"
                value={nuevoProducto.stock}
                onChange={event => setNuevoProducto(actual => ({ ...actual, stock: event.target.value }))}
                required
              />
            </div>
            <div className="voke-form-group-block">
              <label className="voke-form-label" htmlFor="producto-categoria">Categoría</label>
              <select
                id="producto-categoria"
                className="voke-form-input-text"
                value={nuevoProducto.categoriaId}
                onChange={event => setNuevoProducto(actual => ({ ...actual, categoriaId: event.target.value }))}
                required
              >
                <option value="">Selecciona una categoría</option>
                {categorias.map(categoria => (
                  <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
                ))}
              </select>
            </div>
            <div className="voke-form-group-block">
              <label className="voke-form-label" htmlFor="producto-imagen">URL de imagen</label>
              <input
                id="producto-imagen"
                className="voke-form-input-text"
                type="url"
                value={nuevoProducto.imagenUrl}
                onChange={event => {
                  setNuevoProducto(actual => ({ ...actual, imagenUrl: event.target.value }));
                  setEstadoVistaPrevia(event.target.value.trim() ? 'cargando' : '');
                }}
                placeholder="Enlace directo .jpg, .png o .webp"
                required
              />
            </div>
          </div>
          {nuevoProducto.imagenUrl && (
            <div className="voke-dashboard-product-preview-area" aria-live="polite">
              {estadoVistaPrevia !== 'error' && (
                <img
                  className="voke-dashboard-product-image-preview"
                  src={nuevoProducto.imagenUrl.trim()}
                  alt="Vista previa del producto"
                  onError={() => setEstadoVistaPrevia('error')}
                  onLoad={() => setEstadoVistaPrevia('lista')}
                />
              )}
              {estadoVistaPrevia === 'cargando' && <p className="voke-dashboard-preview-message">Cargando imagen...</p>}
              {estadoVistaPrevia === 'error' && (
                <p className="voke-dashboard-preview-message voke-dashboard-preview-error">
                  No se pudo cargar. Usa la URL directa del archivo de imagen, no la página de Pixabay u otra página web.
                </p>
              )}
              {estadoVistaPrevia === 'lista' && <p className="voke-dashboard-preview-message">Vista previa lista</p>}
            </div>
          )}
          <div className="voke-dashboard-product-actions">
            <button type="submit" className="voke-submit-btn-black btn-alta-dashboard">
              {productoEditandoId ? 'Guardar cambios' : 'Guardar producto'}
            </button>
            {productoEditandoId && (
              <button type="button" className="voke-btn-volver" onClick={manejarCancelarEdicionProducto}>
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      </div>
      </section>
      )}

      {seccionActiva === 'productos' && (
      <section className="voke-dashboard-view">
      <div className="voke-dashboard-view-heading"><div><h3>Administrar productos</h3><p>Consulta productos, stock y referencias antes de modificar o eliminar.</p></div></div>
      <div className="voke-dashboard-seccion-bloque">
        <h3 className="voke-form-title-subsegment">Consultar y administrar productos</h3>
        <div className="voke-dashboard-tabla-contenedor">
          <table className="voke-dashboard-tabla">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Marca</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Uso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map(producto => {
                const enUso = Number(producto.usos_carrito || 0) + Number(producto.usos_pedidos || 0) > 0;
                const categoria = categorias.find(item => Number(item.id) === Number(producto.categoria_id));
                return (
                  <tr key={producto.id}>
                    <td>
                      <div className="voke-dashboard-product-table-name">
                        {producto.imagenes?.[0] && <img src={producto.imagenes[0]} alt="" loading="lazy" />}
                        <span>{producto.nombre}</span>
                      </div>
                    </td>
                    <td>{producto.marca || 'Sin marca'}</td>
                    <td>{categoria?.nombre || 'Sin categoría'}</td>
                    <td>{producto.descripcion || 'Sin descripción'}</td>
                    <td>R$ {Number(producto.precio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td>{producto.stock} un.</td>
                    <td>{enUso ? `Carritos: ${producto.usos_carrito || 0}; pedidos: ${producto.usos_pedidos || 0}` : 'Sin referencias'}</td>
                    <td>
                      <div className="voke-dashboard-product-row-actions">
                        <button type="button" className="voke-btn-rol-toggle btn-ascend" onClick={() => manejarEditarProducto(producto)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="voke-btn-eliminar btn-baja-dashboard"
                          onClick={() => manejarEliminarProducto(producto)}
                          disabled={enUso}
                          title={enUso ? 'No se puede eliminar porque está asociado a un carrito o pedido' : 'Eliminar producto'}
                        >
                          {enUso ? 'En uso' : 'Eliminar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {productos.length === 0 && (
                <tr><td colSpan="8">No hay productos registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </section>
      )}

      {/* ================= SECCIÓN 4: GESTIÓN DE CATEGORÍAS (ABM) ================= */}
      {seccionActiva === 'categorias' && (
      <section className="voke-dashboard-view">
      <div className="voke-dashboard-view-heading"><div><h3>Categorías del catálogo</h3><p>Agrega categorías y consulta su inventario vinculado.</p></div></div>
      <div className="voke-dashboard-seccion-bloque">
        <h3 className="voke-form-title-subsegment">Catálogo de Categorías</h3>
        <form onSubmit={manejarCrearCategoria} className="voke-dashboard-alta-categoria-form">
          <input 
            type="text" 
            value={nuevaCategoria} 
            onChange={(e) => setNuevaCategoria(e.target.value)} 
            placeholder="Nombre de la nueva categoría (Ej: Impresoras)" 
            className="voke-form-input-text" 
            required 
          />
          <button type="submit" className="voke-submit-btn-black btn-alta-dashboard">Agregar Categoría</button>
        </form>

        <div className="voke-dashboard-tabla-contenedor">
          <table className="voke-dashboard-tabla">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre Categoría</th>
                <th>Productos Vinculados</th>
                <th>Inventario Combinado</th>
                <th>Acción de Control</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((cat) => (
                <tr key={cat.id}>
                  <td>#{cat.id}</td>
                  <td className="voke-tarjeta-cuota-destacada">{cat.nombre}</td>
                  <td>{cat.total_productos_vinculados} artículos</td>
                  <td>{cat.stock_total} unidades</td>
                  <td>
                    <button 
                      type="button" 
                      onClick={() => manejarEliminarCategoria(cat.id)} 
                      className={`voke-btn-eliminar btn-baja-dashboard ${parseInt(cat.stock_total) > 0 ? 'btn-desactivado' : ''}`}
                      disabled={parseInt(cat.stock_total) > 0}
                      title={parseInt(cat.stock_total) > 0 ? "Bloqueado: Inventario mayor a cero" : "Eliminar de la tienda"}
                    >
                      {parseInt(cat.stock_total) > 0 ? '🔒 Bloqueado' : '🗑️ Eliminar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </section>
      )}

      {/* ================= SECCIÓN 5: GESTIÓN DE ROLES Y PERSONAL ================= */}
      {seccionActiva === 'personal' && (
      <section className="voke-dashboard-view">
      <div className="voke-dashboard-view-heading"><div><h3>Personal y roles</h3><p>Gestiona accesos de cuentas registradas.</p></div></div>
      <div className="voke-dashboard-seccion-bloque voke-profile-section-form-spaced">
        <h3 className="voke-form-title-subsegment">👥 Control de Personal y Asignación de Roles</h3>
        <p className="voke-notif-subtext">Lista completa de cuentas registradas en PostgreSQL. Permite ascender a clientes comunes a administradores con acceso total al Backoffice.</p>
        <div className="voke-dashboard-tabla-contenedor">
          <table className="voke-dashboard-tabla">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre Completo</th>
                <th>Correo Electrónico</th>
                <th>Rol Actual</th>
                <th>Acción de Seguridad</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((user) => (
                <tr key={user.id}>
                  <td>#{user.id}</td>
                  <td className="voke-tarjeta-cuota-destacada">{user.nome_completo || 'Administrador Semilla'}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`voke-rol-pill ${user.perfil === 'admin' ? 'role-admin' : 'role-cliente'}`}>
                      {user.perfil === 'admin' ? '🛡️ Administrador' : '👤 Cliente'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => manejarCambioDeRol(user.id, user.perfil)}
                      className={`voke-btn-rol-toggle ${user.perfil === 'admin' ? 'btn-degrade' : 'btn-ascend'}`}
                      disabled={parseInt(user.id) === JSON.parse(localStorage.getItem('voke_usuario') || '{}').id}
                      title={parseInt(user.id) === JSON.parse(localStorage.getItem('voke_usuario') || '{}').id ? "Cuenta maestra protegida" : "Cambiar permisos"}
                    >
                      {parseInt(user.id) === JSON.parse(localStorage.getItem('voke_usuario') || '{}').id ? '🔒 Protegido' : (user.perfil === 'admin' ? '⬇️ Degradar' : '⬆️ Ascender')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </section>
      )}

        </main>
      </div>
    </div>
  );
};

export default DashboardAdmin;