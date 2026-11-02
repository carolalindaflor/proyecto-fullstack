import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';

const DashboardAdmin = () => {
  const navigate = useNavigate();

  const [seccionActiva, setSeccionActiva] = useState('resumen');
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

  // 1. CARGA INICIAL DEL PAINEL
  const cargarInformacionDashboard = async () => {
    try {
      const token = localStorage.getItem('voke_token');
      const configuracion = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const [
        resAnalitica,
        resCategorias,
        resUsuarios,
        resPedidos,
        resProductos
      ] = await Promise.all([
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
      setErrorDashboard(
        err.response?.data?.error ||
        'Erro ao carregar os dados do painel administrativo.'
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => cargarInformacionDashboard());
  }, []);

  // 2. ATUALIZAR STATUS DE ENTREGA
  const manejarCambioEstadoPedido = async (idPedido, nuevoEstado) => {
    setErrorDashboard('');
    setMensajeExito('');

    try {
      const token = localStorage.getItem('voke_token');
      const configuracion = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const cuerpo = {
        nuevoEstado,
        detallesHistorial: `O pedido foi movido para o status [${nuevoEstado}] pelo administrador.`
      };

      const respuesta = await api.put(
        `/logistica/actualizar-estado/${idPedido}`,
        cuerpo,
        configuracion
      );

      setMensajeExito(
        respuesta.data.mensaje || 'Status atualizado com sucesso!'
      );

      await cargarInformacionDashboard();

    } catch (err) {
      setErrorDashboard(
        err.response?.data?.error ||
        'Erro ao atualizar o status da entrega.'
      );
    }
  };

  // 3. ALTERAR PERFIL DO USUÁRIO
  const manejarCambioDeRol = async (idUsuario, rolActual) => {
    const nuevoPerfil = rolActual === 'admin' ? 'cliente' : 'admin';

    const mensajeConfirmacion = nuevoPerfil === 'admin'
      ? 'Tem certeza de que deseja promover este usuário a administrador da Voke?'
      : 'Tem certeza de que deseja remover as permissões de administrador e alterar o perfil para cliente?';

    if (!window.confirm(mensajeConfirmacion)) return;

    setErrorDashboard('');
    setMensajeExito('');

    try {
      const token = localStorage.getItem('voke_token');
      const configuracion = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const respuesta = await api.put(
        `/dashboard/usuarios/rol/${idUsuario}`,
        { nuevoPerfil },
        configuracion
      );

      setMensajeExito(
        respuesta.data.mensaje || 'Perfil atualizado com sucesso no PostgreSQL!'
      );

      await cargarInformacionDashboard();

    } catch (err) {
      setErrorDashboard(
        err.response?.data?.error ||
        'Erro ao modificar o perfil do usuário.'
      );
    }
  };

  // 4. CRIAR CATEGORIA
  const manejarCrearCategoria = async (e) => {
    e.preventDefault();

    setErrorDashboard('');
    setMensajeExito('');

    if (!nuevaCategoria.trim()) return;

    try {
      const token = localStorage.getItem('voke_token');
      const configuracion = {
        headers: { Authorization: `Bearer ${token}` }
      };

      await api.post(
        '/dashboard/categorias',
        { nombre: nuevaCategoria },
        configuracion
      );

      setNuevaCategoria('');
      setMensajeExito('Categoria adicionada com sucesso ao catálogo!');

      await cargarInformacionDashboard();

    } catch (err) {
      setErrorDashboard(
        err.response?.data?.error || 'Erro ao criar categoria.'
      );
    }
  };

  // 5. CRIAR OU EDITAR PRODUTO
  const manejarCrearProducto = async (e) => {
    e.preventDefault();

    setErrorDashboard('');
    setMensajeExito('');

    try {
      const token = localStorage.getItem('voke_token');
      const configuracion = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const {
        nombre,
        marca,
        descripcion,
        precio,
        stock,
        categoriaId,
        imagenUrl
      } = nuevoProducto;

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
        await api.put(
          `/produtos/${productoEditandoId}`,
          datosProducto,
          configuracion
        );
      } else {
        await api.post(
          '/produtos',
          datosProducto,
          configuracion
        );
      }

      const estabaEditando = Boolean(productoEditandoId);

      setNuevoProducto({
        nombre: '',
        marca: '',
        descripcion: '',
        precio: '',
        stock: '0',
        categoriaId: '',
        imagenUrl: ''
      });

      setProductoEditandoId(null);
      setEstadoVistaPrevia('');

      setMensajeExito(
        estabaEditando
          ? 'Produto atualizado com sucesso!'
          : 'Produto adicionado ao catálogo com sucesso!'
      );

      await cargarInformacionDashboard();

    } catch (err) {
      setErrorDashboard(
        err.response?.data?.error ||
        'Não foi possível salvar o produto.'
      );
    }
  };

  // 6. EDITAR PRODUTO
  const manejarEditarProducto = (producto) => {
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

    setEstadoVistaPrevia(
      producto.imagenes?.[0] ? 'cargando' : ''
    );

    setErrorDashboard('');
    setMensajeExito('');

    window.requestAnimationFrame(() => {
      document
        .getElementById('dashboard-product-form')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
    });
  };

  // 7. CANCELAR EDIÇÃO
  const manejarCancelarEdicionProducto = () => {
    setProductoEditandoId(null);

    setNuevoProducto({
      nombre: '',
      marca: '',
      descripcion: '',
      precio: '',
      stock: '0',
      categoriaId: '',
      imagenUrl: ''
    });

    setEstadoVistaPrevia('');
  };

  // 8. EXCLUIR PRODUTO
  const manejarEliminarProducto = async (producto) => {
    const usos =
      Number(producto.usos_carrito || 0) +
      Number(producto.usos_pedidos || 0);

    if (usos > 0) {
      setErrorDashboard(
        'Este produto está associado a um carrinho ou pedido e não pode ser excluído.'
      );
      return;
    }

    if (!window.confirm(
      `Deseja excluir "${producto.nombre}"? Esta ação não pode ser desfeita.`
    )) return;

    setErrorDashboard('');
    setMensajeExito('');

    try {
      const token = localStorage.getItem('voke_token');

      await api.delete(`/produtos/${producto.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMensajeExito('Produto excluído do catálogo.');

      await cargarInformacionDashboard();

    } catch (err) {
      setErrorDashboard(
        err.response?.data?.error ||
        'Não foi possível excluir o produto.'
      );
    }
  };

  // 9. ENCERRAR SESSÃO
  const manejarCerrarSesion = () => {
    localStorage.clear();
    window.dispatchEvent(new Event('carrito_actualizado'));
    navigate('/login', { replace: true });
  };

  // 10. EXCLUIR CATEGORIA
  const manejarEliminarCategoria = async (idCategoria) => {
    if (!window.confirm(
      'Tem certeza de que deseja excluir esta categoria do banco de dados?'
    )) return;

    setErrorDashboard('');
    setMensajeExito('');

    try {
      const token = localStorage.getItem('voke_token');
      const configuracion = {
        headers: { Authorization: `Bearer ${token}` }
      };

      await api.delete(
        `/dashboard/categorias/${idCategoria}`,
        configuracion
      );

      setMensajeExito('Categoria removida do catálogo com sucesso!');

      await cargarInformacionDashboard();

    } catch (err) {
      setErrorDashboard(
        err.response?.data?.error ||
        'Erro ao excluir categoria.'
      );
    }
  };

  // TELA DE CARREGAMENTO
  if (cargando) {
    return (
      <div className="voke-catalogo-cargando-box">
        <p>Carregando dados administrativos...</p>
      </div>
    );
  }

  // 11. DADOS DE LOGÍSTICA
  const logisticaData = metricas?.logistica || {
    pendientes: 0,
    despachados: 0,
    en_camino: 0,
    entregados: 0,
    devueltos: 0,
    no_entregados: 0
  };

  const unidadesTotales = productos.reduce(
    (total, producto) => total + Number(producto.stock || 0),
    0
  );

  const productosStockBajo = productos.filter(
    producto => Number(producto.stock || 0) <= 5
  );

  const pedidosPendentes = pedidos.filter(
    pedido => ![
      'Entregado',
      'Devuelto',
      'No entregado'
    ].includes(pedido.status_envio)
  );

  const secciones = [
    { id: 'resumen', icono: '▦', nombre: 'Resumo' },
    {
      id: 'envios',
      icono: '◷',
      nombre: 'Monitoramento de entregas',
      contador: logisticaData.en_camino
    },
    {
      id: 'pedidos',
      icono: '▤',
      nombre: 'Pedidos e despachos',
      contador: pedidosPendentes.length
    },
    {
      id: 'inventario',
      icono: '▣',
      nombre: 'Inventário e alertas',
      contador: productosStockBajo.length
    },
    { id: 'alta-producto', icono: '+', nombre: 'Adicionar produto' },
    { id: 'productos', icono: '▤', nombre: 'Administrar produtos' },
    { id: 'categorias', icono: '◇', nombre: 'Categorias' },
    { id: 'personal', icono: '♙', nombre: 'Equipe e permissões' }
  ];

  const usuarioActual = JSON.parse(
    localStorage.getItem('voke_usuario') || '{}'
  );

  return (
    <div className="voke-dashboard-wrapper-principal">

      {/* CABEÇALHO */}
      <div className="voke-dashboard-heading-row">
        <img
          src="/logo-deshboardadm.jpeg"
          alt="Logo Voke Brasil"
          className="voke-logo-dashboard"
        />

        <div className="voke-form-title-block">
          <p className="voke-dashboard-eyebrow">
            VOKE BRASIL / ADMINISTRAÇÃO
          </p>

          <h2 className="voke-form-title-text">
            {secciones.find(
              seccion => seccion.id === seccionActiva
            )?.nombre || 'Resumo'}
          </h2>

          <p className="voke-form-subtitle-text">
            Gestão da loja e controle de estoque
          </p>
        </div>
      </div>

      <div className="voke-dashboard-layout">

        {/* MENU LATERAL */}
        <aside
          className="voke-dashboard-sidebar"
          aria-label="Navegação administrativa"
        >
          <p className="voke-dashboard-sidebar-label">
            GESTÃO
          </p>

          <nav className="voke-dashboard-nav">
            {secciones.map(seccion => (
              <button
                type="button"
                key={seccion.id}
                className={`voke-dashboard-nav-item ${
                  seccionActiva === seccion.id ? 'is-active' : ''
                }`}
                onClick={() => setSeccionActiva(seccion.id)}
                aria-current={
                  seccionActiva === seccion.id ? 'page' : undefined
                }
              >
                <span
                  className="voke-dashboard-nav-icon"
                  aria-hidden="true"
                >
                  {seccion.icono}
                </span>

                <span className="voke-dashboard-nav-name">
                  {seccion.nombre}
                </span>

                {seccion.contador > 0 && (
                  <span className="voke-dashboard-nav-count">
                    {seccion.contador}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="voke-dashboard-sidebar-footer">
            <span
              className="voke-dashboard-status-dot"
              aria-hidden="true"
            />
            <span>Painel conectado</span>
          </div>

          <button
            type="button"
            className="voke-dashboard-logout"
            onClick={manejarCerrarSesion}
          >
            <span aria-hidden="true">↪</span>
            Sair do painel administrativo
          </button>
        </aside>

        {/* CONTEÚDO PRINCIPAL */}
        <main className="voke-dashboard-main-content">

          {errorDashboard && (
            <div className="voke-alerta-box voke-alerta-error">
              {errorDashboard}
            </div>
          )}

          {mensajeExito && (
            <div className="voke-alerta-box voke-alerta-success">
              {mensajeExito}
            </div>
          )}

          {/* 12. RESUMO DA LOJA */}
          {seccionActiva === 'resumen' && (
            <section
              className="voke-dashboard-view"
              aria-labelledby="dashboard-summary-title"
            >
              <div className="voke-dashboard-view-heading">
                <div>
                  <h3 id="dashboard-summary-title">
                    Resumo da loja
                  </h3>
                  <p>
                    Principais indicadores e atividades recentes.
                  </p>
                </div>

                <span className="voke-dashboard-updated">
                  Dados atualizados
                </span>
              </div>

              <div className="voke-dashboard-summary-grid">

                <article className="voke-dashboard-summary-item summary-sales">
                  <span className="voke-dashboard-summary-label">
                    Vendas aprovadas
                  </span>
                  <strong>
                    R$ {Number(metricas?.totalVendas || 0).toLocaleString(
                      'pt-BR',
                      { minimumFractionDigits: 2 }
                    )}
                  </strong>
                  <span className="voke-dashboard-summary-note">
                    Total acumulado registrado
                  </span>
                </article>

                <article className="voke-dashboard-summary-item">
                  <span className="voke-dashboard-summary-label">
                    Pedidos registrados
                  </span>
                  <strong>{pedidos.length}</strong>
                  <span className="voke-dashboard-summary-note">
                    {pedidosPendentes.length} precisam de acompanhamento
                  </span>
                </article>

                <article className="voke-dashboard-summary-item">
                  <span className="voke-dashboard-summary-label">
                    Unidades em estoque
                  </span>
                  <strong>
                    {unidadesTotales.toLocaleString('pt-BR')}
                  </strong>
                  <span className="voke-dashboard-summary-note">
                    Em {productos.length} produtos
                  </span>
                </article>

                <article className={`voke-dashboard-summary-item ${
                  productosStockBajo.length ? 'summary-warning' : ''
                }`}>
                  <span className="voke-dashboard-summary-label">
                    Alertas de estoque
                  </span>
                  <strong>{productosStockBajo.length}</strong>
                  <span className="voke-dashboard-summary-note">
                    Produtos com 5 unidades ou menos
                  </span>
                </article>

              </div>

              {/* PEDIDOS RECENTES */}
              <section className="voke-dashboard-recent-section">
                <div className="voke-dashboard-view-heading">
                  <div>
                    <h3>Pedidos recentes</h3>
                    <p>
                      Últimas movimentações registradas na loja.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="voke-dashboard-text-action"
                    onClick={() => setSeccionActiva('pedidos')}
                  >
                    Ver pedidos <span aria-hidden="true">→</span>
                  </button>
                </div>

                <div className="voke-dashboard-recent-list">
                  {pedidos.slice(0, 5).map(pedido => (
                    <div
                      className="voke-dashboard-recent-row"
                      key={pedido.id}
                    >
                      <span className="voke-dashboard-recent-id">
                        #{pedido.id}
                      </span>

                      <span className="voke-dashboard-recent-customer">
                        {pedido.nome_completo || 'Cliente'}
                      </span>

                      <span className="voke-dashboard-recent-city">
                        {pedido.ciudad || 'Sem destino'}
                      </span>

                      <span className={`voke-stock-alerta-pill ${
                        pedido.status_envio === 'Entregado'
                          ? 'pill-optimo'
                          : (
                            ['Devuelto', 'No entregado'].includes(
                              pedido.status_envio
                            )
                              ? 'pill-critico'
                              : 'role-admin'
                          )
                      }`}>
                        {pedido.status_envio}
                      </span>

                      <strong>
                        R$ {Number(pedido.total || 0).toLocaleString(
                          'pt-BR',
                          { minimumFractionDigits: 2 }
                        )}
                      </strong>
                    </div>
                  ))}

                  {pedidos.length === 0 && (
                    <p className="voke-dashboard-empty-state">
                      Ainda não há pedidos para mostrar.
                    </p>
                  )}
                </div>
              </section>
            </section>
          )}

          {/* 13. MONITORAMENTO DE ENTREGAS */}
          {seccionActiva === 'envios' && (
            <section className="voke-dashboard-view">
              <div className="voke-dashboard-view-heading">
                <div>
                  <h3>Monitoramento de entregas</h3>
                  <p>
                    Distribuição atual dos status de entrega.
                  </p>
                </div>
              </div>

              <div className="voke-dashboard-seccion-bloque">
                <div className="voke-dashboard-grid-logistica">

                  <div className="voke-logistica-badge-item status-pendiente">
                    <span>Pendentes:</span>
                    <strong>{logisticaData.pendientes}</strong>
                  </div>

                  <div className="voke-logistica-badge-item status-despachado">
                    <span>Despachados:</span>
                    <strong>{logisticaData.despachados}</strong>
                  </div>

                  <div className="voke-logistica-badge-item status-camino">
                    <span>A caminho:</span>
                    <strong>{logisticaData.en_camino}</strong>
                  </div>

                  <div className="voke-logistica-badge-item status-entregado">
                    <span>Entregues:</span>
                    <strong>{logisticaData.entregados}</strong>
                  </div>

                  <div className="voke-logistica-badge-item status-devuelto">
                    <span>Devolvidos:</span>
                    <strong>{logisticaData.devueltos}</strong>
                  </div>

                  <div className="voke-logistica-badge-item status-no-entregado">
                    <span>Não entregues:</span>
                    <strong>{logisticaData.no_entregados}</strong>
                  </div>

                </div>
              </div>
            </section>
          )}

          {/* 14. GESTÃO DE PEDIDOS */}
          {seccionActiva === 'pedidos' && (
            <section className="voke-dashboard-view">

              <div className="voke-dashboard-view-heading">
                <div>
                  <h3>Pedidos e entregas</h3>
                  <p>
                    Consulte cada pedido e atualize seu status de entrega.
                  </p>
                </div>
              </div>

              <div className="voke-dashboard-seccion-bloque voke-profile-section-form-spaced">

                <h3 className="voke-form-title-subsegment">
                  📦 Gestão de pedidos e controle de entregas
                </h3>

                <p className="voke-notif-subtext">
                  Altere o status dos pedidos para atualizar os indicadores e notificar o cliente.
                </p>

                <div className="voke-dashboard-tabla-contenedor">
                  <table className="voke-dashboard-tabla">
                    <thead>
                      <tr>
                        <th>Pedido</th>
                        <th>Cliente</th>
                        <th>Destino</th>
                        <th>Total</th>
                        <th>Status do pagamento</th>
                        <th>Status da entrega</th>
                        <th>Ação operacional</th>
                      </tr>
                    </thead>

                    <tbody>
                      {pedidos.map(ped => (
                        <tr key={ped.id}>
                          <td><strong>#{ped.id}</strong></td>
                          <td>{ped.nome_completo}</td>
                          <td>{ped.ciudad}</td>

                          <td className="voke-tarjeta-cuota-destacada">
                            R$ {parseFloat(ped.total || 0).toLocaleString(
                              'pt-BR',
                              { minimumFractionDigits: 2 }
                            )}
                          </td>

                          <td>
                            <span className={`voke-stock-alerta-pill ${
                              ped.estado_pago === 'Pago Aprovado'
                                ? 'pill-optimo'
                                : 'pill-critico'
                            }`}>
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
                              onChange={e =>
                                manejarCambioEstadoPedido(
                                  ped.id,
                                  e.target.value
                                )
                              }
                              className="voke-form-input-text voke-select-logistica-dashboard"
                            >
                              <option value="Pendiente">
                                ⏳ Pendente
                              </option>
                              <option value="Despachado">
                                📦 Despachado
                              </option>
                              <option value="En camino">
                                🚚 A caminho
                              </option>
                              <option value="Entregado">
                                ✅ Entregue
                              </option>
                              <option value="Devuelto">
                                ↩️ Devolvido
                              </option>
                              <option value="No entregado">
                                ❌ Não entregue
                              </option>
                            </select>
                          </td>
                        </tr>
                      ))}

                      {pedidos.length === 0 && (
                        <tr>
                          <td colSpan="7">
                            Ainda não há pedidos registrados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* 15. ESTOQUE E ALERTAS */}
          {seccionActiva === 'inventario' && (
            <section className="voke-dashboard-view">

              <div className="voke-dashboard-view-heading">
                <div>
                  <h3>Estoque e alertas</h3>
                  <p>
                    {productosStockBajo.length} produtos precisam de reposição.
                  </p>
                </div>
              </div>

              <div className="voke-dashboard-seccion-bloque voke-profile-section-form-spaced">

                <h3 className="voke-form-title-subsegment">
                  📊 Estoque e alertas de armazenamento
                </h3>

                <div className="voke-dashboard-tabla-contenedor">
                  <table className="voke-dashboard-tabla">
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Preço base</th>
                        <th>Quantidade em estoque</th>
                        <th>Status do estoque</th>
                      </tr>
                    </thead>

                    <tbody>
                      {metricas?.inventarioStock?.map((prod, idx) => (
                        <tr key={idx}>
                          <td>{prod.nombre}</td>

                          <td>
                            R$ {parseFloat(prod.precio || 0).toLocaleString(
                              'pt-BR',
                              { minimumFractionDigits: 2 }
                            )}
                          </td>

                          <td className="voke-tarjeta-cuota-destacada">
                            {prod.stock} un.
                          </td>

                          <td>
                            <span className={`voke-stock-alerta-pill ${
                              prod.stock <= 5
                                ? 'pill-critico'
                                : 'pill-optimo'
                            }`}>
                              {prod.stock === 0
                                ? 'Esgotado'
                                : (
                                  prod.stock <= 5
                                    ? 'Estoque baixo'
                                    : 'Estoque adequado'
                                )}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {(!metricas?.inventarioStock ||
                        metricas.inventarioStock.length === 0) && (
                        <tr>
                          <td colSpan="4">
                            Não há dados de estoque disponíveis.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* 16. CADASTRO E EDIÇÃO DE PRODUTOS */}
          {seccionActiva === 'alta-producto' && (
            <section className="voke-dashboard-view">

              <div className="voke-dashboard-view-heading">
                <div>
                  <h3>
                    {productoEditandoId
                      ? 'Editar produto'
                      : 'Adicionar produto'}
                  </h3>
                  <p>
                    Preencha os dados comerciais e de estoque do produto.
                  </p>
                </div>
              </div>

              <div className="voke-dashboard-seccion-bloque voke-profile-section-form-spaced">

                <h3 className="voke-form-title-subsegment">
                  {productoEditandoId
                    ? `Editar produto #${productoEditandoId}`
                    : 'Adicionar produto ao catálogo'}
                </h3>

                <form
                  id="dashboard-product-form"
                  onSubmit={manejarCrearProducto}
                  className="voke-dashboard-product-form"
                >

                  <div className="voke-dashboard-product-fields">

                    <div className="voke-form-group-block">
                      <label className="voke-form-label" htmlFor="producto-nombre">
                        Nome do produto
                      </label>
                      <input
                        id="producto-nombre"
                        className="voke-form-input-text"
                        value={nuevoProducto.nombre}
                        onChange={event =>
                          setNuevoProducto(actual => ({
                            ...actual,
                            nombre: event.target.value
                          }))
                        }
                        required
                      />
                    </div>

                    <div className="voke-form-group-block">
                      <label className="voke-form-label" htmlFor="producto-marca">
                        Marca
                      </label>
                      <input
                        id="producto-marca"
                        className="voke-form-input-text"
                        value={nuevoProducto.marca}
                        onChange={event =>
                          setNuevoProducto(actual => ({
                            ...actual,
                            marca: event.target.value
                          }))
                        }
                        placeholder="Ex.: Dell, HP, Lenovo"
                        required
                      />
                    </div>

                    <div className="voke-form-group-block voke-dashboard-product-description">
                      <label className="voke-form-label" htmlFor="producto-descripcion">
                        Descrição
                      </label>
                      <textarea
                        id="producto-descripcion"
                        className="voke-form-input-text voke-dashboard-product-textarea"
                        value={nuevoProducto.descripcion}
                        onChange={event =>
                          setNuevoProducto(actual => ({
                            ...actual,
                            descripcion: event.target.value
                          }))
                        }
                        rows="3"
                      />
                    </div>

                    <div className="voke-form-group-block">
                      <label className="voke-form-label" htmlFor="producto-precio">
                        Preço (R$)
                      </label>
                      <input
                        id="producto-precio"
                        className="voke-form-input-text"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={nuevoProducto.precio}
                        onChange={event =>
                          setNuevoProducto(actual => ({
                            ...actual,
                            precio: event.target.value
                          }))
                        }
                        required
                      />
                    </div>

                    <div className="voke-form-group-block">
                      <label className="voke-form-label" htmlFor="producto-stock">
                        Estoque inicial
                      </label>
                      <input
                        id="producto-stock"
                        className="voke-form-input-text"
                        type="number"
                        min="0"
                        step="1"
                        value={nuevoProducto.stock}
                        onChange={event =>
                          setNuevoProducto(actual => ({
                            ...actual,
                            stock: event.target.value
                          }))
                        }
                        required
                      />
                    </div>

                    <div className="voke-form-group-block">
                      <label className="voke-form-label" htmlFor="producto-categoria">
                        Categoria
                      </label>
                      <select
                        id="producto-categoria"
                        className="voke-form-input-text"
                        value={nuevoProducto.categoriaId}
                        onChange={event =>
                          setNuevoProducto(actual => ({
                            ...actual,
                            categoriaId: event.target.value
                          }))
                        }
                        required
                      >
                        <option value="">
                          Selecione uma categoria
                        </option>

                        {categorias.map(categoria => (
                          <option
                            key={categoria.id}
                            value={categoria.id}
                          >
                            {categoria.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="voke-form-group-block">
                      <label className="voke-form-label" htmlFor="producto-imagen">
                        URL da imagem
                      </label>
                      <input
                        id="producto-imagen"
                        className="voke-form-input-text"
                        type="url"
                        value={nuevoProducto.imagenUrl}
                        onChange={event => {
                          setNuevoProducto(actual => ({
                            ...actual,
                            imagenUrl: event.target.value
                          }));

                          setEstadoVistaPrevia(
                            event.target.value.trim()
                              ? 'cargando'
                              : ''
                          );
                        }}
                        placeholder="Link direto para imagem .jpg, .png ou .webp"
                        required
                      />
                    </div>

                  </div>

                  {/* PRÉ-VISUALIZAÇÃO DA IMAGEM */}
                  {nuevoProducto.imagenUrl && (
                    <div
                      className="voke-dashboard-product-preview-area"
                      aria-live="polite"
                    >
                      {estadoVistaPrevia !== 'error' && (
                        <img
                          className="voke-dashboard-product-image-preview"
                          src={nuevoProducto.imagenUrl.trim()}
                          alt="Pré-visualização do produto"
                          onError={() => setEstadoVistaPrevia('error')}
                          onLoad={() => setEstadoVistaPrevia('lista')}
                        />
                      )}

                      {estadoVistaPrevia === 'cargando' && (
                        <p className="voke-dashboard-preview-message">
                          Carregando imagem...
                        </p>
                      )}

                      {estadoVistaPrevia === 'error' && (
                        <p className="voke-dashboard-preview-message voke-dashboard-preview-error">
                          Não foi possível carregar a imagem. Use o link direto do arquivo de imagem, e não o endereço de uma página.
                        </p>
                      )}

                      {estadoVistaPrevia === 'lista' && (
                        <p className="voke-dashboard-preview-message">
                          Pré-visualização pronta
                        </p>
                      )}
                    </div>
                  )}

                  <div className="voke-dashboard-product-actions">

                    <button
                      type="submit"
                      className="voke-submit-btn-black btn-alta-dashboard"
                    >
                      {productoEditandoId
                        ? 'Salvar alterações'
                        : 'Salvar produto'}
                    </button>

                    {productoEditandoId && (
                      <button
                        type="button"
                        className="voke-btn-volver"
                        onClick={manejarCancelarEdicionProducto}
                      >
                        Cancelar edição
                      </button>
                    )}

                  </div>
                </form>
              </div>
            </section>
          )}

          {/* 17. ADMINISTRAR PRODUTOS */}
          {seccionActiva === 'productos' && (
            <section className="voke-dashboard-view">

              <div className="voke-dashboard-view-heading">
                <div>
                  <h3>Administrar produtos</h3>
                  <p>
                    Consulte produtos, estoque e referências antes de modificar ou excluir.
                  </p>
                </div>
              </div>

              <div className="voke-dashboard-seccion-bloque">

                <h3 className="voke-form-title-subsegment">
                  Consultar e administrar produtos
                </h3>

                <div className="voke-dashboard-tabla-contenedor">
                  <table className="voke-dashboard-tabla">

                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Marca</th>
                        <th>Categoria</th>
                        <th>Descrição</th>
                        <th>Preço</th>
                        <th>Estoque</th>
                        <th>Uso</th>
                        <th>Ações</th>
                      </tr>
                    </thead>

                    <tbody>
                      {productos.map(producto => {
                        const enUso =
                          Number(producto.usos_carrito || 0) +
                          Number(producto.usos_pedidos || 0) > 0;

                        const categoria = categorias.find(
                          item => Number(item.id) === Number(producto.categoria_id)
                        );

                        return (
                          <tr key={producto.id}>
                            <td>
                              <div className="voke-dashboard-product-table-name">
                                {producto.imagenes?.[0] && (
                                  <img
                                    src={producto.imagenes[0]}
                                    alt=""
                                    loading="lazy"
                                  />
                                )}
                                <span>{producto.nombre}</span>
                              </div>
                            </td>

                            <td>{producto.marca || 'Sem marca'}</td>
                            <td>{categoria?.nombre || 'Sem categoria'}</td>
                            <td>{producto.descripcion || 'Sem descrição'}</td>

                            <td>
                              R$ {Number(producto.precio || 0).toLocaleString(
                                'pt-BR',
                                { minimumFractionDigits: 2 }
                              )}
                            </td>

                            <td>{producto.stock} un.</td>

                            <td>
                              {enUso
                                ? `Carrinhos: ${producto.usos_carrito || 0}; pedidos: ${producto.usos_pedidos || 0}`
                                : 'Sem referências'}
                            </td>

                            <td>
                              <div className="voke-dashboard-product-row-actions">

                                <button
                                  type="button"
                                  className="voke-btn-rol-toggle btn-ascend"
                                  onClick={() => manejarEditarProducto(producto)}
                                >
                                  Editar
                                </button>

                                <button
                                  type="button"
                                  className="voke-btn-eliminar btn-baja-dashboard"
                                  onClick={() => manejarEliminarProducto(producto)}
                                  disabled={enUso}
                                  title={
                                    enUso
                                      ? 'Não é possível excluir: produto associado a um carrinho ou pedido.'
                                      : 'Excluir produto'
                                  }
                                >
                                  {enUso ? 'Em uso' : 'Excluir'}
                                </button>

                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {productos.length === 0 && (
                        <tr>
                          <td colSpan="8">
                            Não há produtos registrados.
                          </td>
                        </tr>
                      )}
                    </tbody>

                  </table>
                </div>
              </div>
            </section>
          )}

          {/* 18. GESTÃO DE CATEGORIAS */}
          {seccionActiva === 'categorias' && (
            <section className="voke-dashboard-view">

              <div className="voke-dashboard-view-heading">
                <div>
                  <h3>Categorias do catálogo</h3>
                  <p>
                    Adicione categorias e consulte seu inventário vinculado.
                  </p>
                </div>
              </div>

              <div className="voke-dashboard-seccion-bloque">

                <h3 className="voke-form-title-subsegment">
                  Catálogo de categorias
                </h3>

                <form
                  onSubmit={manejarCrearCategoria}
                  className="voke-dashboard-alta-categoria-form"
                >
                  <input
                    type="text"
                    value={nuevaCategoria}
                    onChange={e => setNuevaCategoria(e.target.value)}
                    placeholder="Nome da nova categoria (Ex.: Impressoras)"
                    className="voke-form-input-text"
                    required
                  />

                  <button
                    type="submit"
                    className="voke-submit-btn-black btn-alta-dashboard"
                  >
                    Adicionar categoria
                  </button>
                </form>

                <div className="voke-dashboard-tabla-contenedor">
                  <table className="voke-dashboard-tabla">

                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Nome da categoria</th>
                        <th>Produtos vinculados</th>
                        <th>Inventário combinado</th>
                        <th>Ação de controle</th>
                      </tr>
                    </thead>

                    <tbody>
                      {categorias.map(cat => (
                        <tr key={cat.id}>
                          <td>#{cat.id}</td>

                          <td className="voke-tarjeta-cuota-destacada">
                            {cat.nombre}
                          </td>

                          <td>
                            {cat.total_productos_vinculados} artigos
                          </td>

                          <td>{cat.stock_total} unidades</td>

                          <td>
                            <button
                              type="button"
                              onClick={() => manejarEliminarCategoria(cat.id)}
                              className={`voke-btn-eliminar btn-baja-dashboard ${
                                parseInt(cat.stock_total) > 0
                                  ? 'btn-desactivado'
                                  : ''
                              }`}
                              disabled={parseInt(cat.stock_total) > 0}
                              title={
                                parseInt(cat.stock_total) > 0
                                  ? 'Bloqueado: inventário maior que zero'
                                  : 'Excluir da loja'
                              }
                            >
                              {parseInt(cat.stock_total) > 0
                                ? '🔒 Bloqueado'
                                : '🗑️ Excluir'}
                            </button>
                          </td>
                        </tr>
                      ))}

                      {categorias.length === 0 && (
                        <tr>
                          <td colSpan="5">
                            Não há categorias cadastradas.
                          </td>
                        </tr>
                      )}
                    </tbody>

                  </table>
                </div>
              </div>
            </section>
          )}

          {/* 19. EQUIPE E PERMISSÕES */}
          {seccionActiva === 'personal' && (
            <section className="voke-dashboard-view">

              <div className="voke-dashboard-view-heading">
                <div>
                  <h3>Equipe e permissões</h3>
                  <p>
                    Gerencie os acessos das contas cadastradas.
                  </p>
                </div>
              </div>

              <div className="voke-dashboard-seccion-bloque voke-profile-section-form-spaced">

                <h3 className="voke-form-title-subsegment">
                  👥 Controle de equipe e atribuição de perfis
                </h3>

                <p className="voke-notif-subtext">
                  Lista de contas registradas no PostgreSQL. Permite alterar o perfil de cliente para administrador e vice-versa.
                </p>

                <div className="voke-dashboard-tabla-contenedor">
                  <table className="voke-dashboard-tabla">

                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Nome completo</th>
                        <th>E-mail</th>
                        <th>Perfil atual</th>
                        <th>Ação de segurança</th>
                      </tr>
                    </thead>

                    <tbody>
                      {usuarios.map(user => (
                        <tr key={user.id}>
                          <td>#{user.id}</td>

                          <td className="voke-tarjeta-cuota-destacada">
                            {user.nome_completo || 'Administrador principal'}
                          </td>

                          <td>{user.email}</td>

                          <td>
                            <span className={`voke-rol-pill ${
                              user.perfil === 'admin'
                                ? 'role-admin'
                                : 'role-cliente'
                            }`}>
                              {user.perfil === 'admin'
                                ? '🛡️ Administrador'
                                : '👤 Cliente'}
                            </span>
                          </td>

                          <td>
                            <button
                              type="button"
                              onClick={() =>
                                manejarCambioDeRol(user.id, user.perfil)
                              }
                              className={`voke-btn-rol-toggle ${
                                user.perfil === 'admin'
                                  ? 'btn-degrade'
                                  : 'btn-ascend'
                              }`}
                              disabled={
                                parseInt(user.id) === Number(usuarioActual.id)
                              }
                              title={
                                parseInt(user.id) === Number(usuarioActual.id)
                                  ? 'Conta principal protegida'
                                  : 'Alterar permissões'
                              }
                            >
                              {parseInt(user.id) === Number(usuarioActual.id)
                                ? '🔒 Protegido'
                                : (
                                  user.perfil === 'admin'
                                    ? '⬇️ Rebaixar'
                                    : '⬆️ Promover'
                                )}
                            </button>
                          </td>
                        </tr>
                      ))}

                      {usuarios.length === 0 && (
                        <tr>
                          <td colSpan="5">
                            Não há usuários cadastrados.
                          </td>
                        </tr>
                      )}
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