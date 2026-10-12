import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../config/api';

const leerUsuarioGuardado = () => {
  try {
    const guardado = localStorage.getItem('voke_usuario');
    return guardado ? JSON.parse(guardado) : null;
  } catch {
    return null;
  }
};

const DrawerMenu = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const user = isOpen ? leerUsuarioGuardado() : null;
  const [categorias, setCategorias] = useState(null);
  const [productos, setProductos] = useState([]);
  const [categoriaAbierta, setCategoriaAbierta] = useState(null);
  const [errorCategorias, setErrorCategorias] = useState('');

  useEffect(() => {
    if (!isOpen) return undefined;

    let activo = true;
    Promise.all([api.get('/categorias'), api.get('/produtos')])
      .then(([respuestaCategorias, respuestaProductos]) => {
        if (activo) {
          setCategorias(Array.isArray(respuestaCategorias.data) ? respuestaCategorias.data : []);
          setProductos(Array.isArray(respuestaProductos.data) ? respuestaProductos.data : []);
          setErrorCategorias('');
        }
      })
      .catch(error => {
        console.error('Error al cargar las categorías:', error);
        if (activo) {
          setCategorias([]);
          setProductos([]);
          setErrorCategorias('No se pudieron cargar los departamentos.');
        }
      });
    return () => {
      activo = false;
    };
  }, [isOpen]);

  const cargandoCategorias = categorias === null && !errorCategorias;

  const buscarProducto = (categoriaId, marca = '') => {
    const parametros = new URLSearchParams({ categoria: String(categoriaId) });
    if (marca) parametros.set('marca', marca);
    navigate(`/?${parametros.toString()}`);
    onClose();
  };

  const alternarCategoria = categoriaId => {
    setCategoriaAbierta(actual => actual === categoriaId ? null : categoriaId);
  };

  if (!isOpen) return null;

  return (
    <div className="voke-drawer-overlay" onClick={onClose}>
      <div className="voke-drawer-box" onClick={(e) => e.stopPropagation()}>
        
        {/* CABECERA DEL MENÚ LATERAL */}
        <div className="voke-drawer-header">
          <div className="voke-drawer-welcome">¡Hola, bienvenido!</div>
          <button className="voke-drawer-close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* SECCIÓN DINÁMICA: MI CUENTA */}
        <div className="voke-drawer-account-section">
          {user ? (
            <Link to="/login" className="voke-drawer-account-link" onClick={onClose}>
              <span className="voke-account-icon">👤</span>
              <span className="voke-account-text">{user.nome_completo || user.nombre || 'Mi cuenta'}</span>
            </Link>
          ) : (
            <Link to="/login" className="voke-drawer-account-link" onClick={onClose}>
              <span className="voke-account-icon">👤</span>
              <span className="voke-account-text">Mi cuenta</span>
            </Link>
          )}
        </div>

        {/* CUERPO DE NAVEGACIÓN PRINCIPAL */}
        <div className="voke-drawer-navigation">
          <div className="voke-menu-section-title">Departamentos</div>
          <ul className="voke-main-menu-list">
            {cargandoCategorias && (
              <li className="voke-submenu-item">Cargando departamentos...</li>
            )}
            {errorCategorias && (
              <li className="voke-submenu-item">{errorCategorias}</li>
            )}
            {!cargandoCategorias && !errorCategorias && categorias.map(categoria => (
              <li className="voke-menu-item-main" key={categoria.id}>
                <div
                  className="voke-menu-trigger"
                  onClick={() => alternarCategoria(categoria.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') alternarCategoria(categoria.id);
                  }}
                  aria-expanded={categoriaAbierta === categoria.id}
                >
                  <span>{categoria.nombre}</span>
                  <span className="voke-menu-arrow">{categoriaAbierta === categoria.id ? '▲' : '▼'}</span>
                </div>
                {categoriaAbierta === categoria.id && (
                  <ul className="voke-submenu-list">
                    <li
                      className="voke-submenu-item-all"
                      onClick={() => buscarProducto(categoria.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') buscarProducto(categoria.id);
                      }}
                    >
                      Acceder a todo
                    </li>
                    <li className="voke-submenu-title">Marcas</li>
                    {Array.from(new Set(productos
                      .filter(producto => Number(producto.categoria_id) === Number(categoria.id))
                      .map(producto => producto.marca?.trim())
                      .filter(Boolean)))
                      .sort((marcaA, marcaB) => marcaA.localeCompare(marcaB, 'pt-BR'))
                      .map(marca => (
                        <li
                          className="voke-submenu-item"
                          key={marca}
                          onClick={() => buscarProducto(categoria.id, marca)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={event => {
                            if (event.key === 'Enter' || event.key === ' ') buscarProducto(categoria.id, marca);
                          }}
                        >
                          {marca}
                        </li>
                      ))}
                    {productos.every(producto =>
                      Number(producto.categoria_id) !== Number(categoria.id) || !producto.marca?.trim()
                    ) && (
                      <li className="voke-submenu-item">Sin marcas registradas</li>
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
};

export default DrawerMenu;