import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';

const DrawerMenu = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const [categorias, setCategorias] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [categoriaAberta, setCategoriaAberta] = useState(null);
  const [erroCategorias, setErroCategorias] = useState('');

  useEffect(() => {
    if (!isOpen) return undefined;

    let ativo = true;

    Promise.all([api.get('/categorias'), api.get('/produtos')])
      .then(([respostaCategorias, respostaProdutos]) => {
        if (ativo) {
          setCategorias(
            Array.isArray(respostaCategorias.data)
              ? respostaCategorias.data
              : []
          );

          setProdutos(
            Array.isArray(respostaProdutos.data)
              ? respostaProdutos.data
              : []
          );

          setErroCategorias('');
        }
      })
      .catch(error => {
        console.error('Erro ao carregar as categorias:', error);

        if (ativo) {
          setCategorias([]);
          setProdutos([]);
          setErroCategorias(
            'Não foi possível carregar os departamentos.'
          );
        }
      });

    return () => {
      ativo = false;
    };
  }, [isOpen]);

  const carregandoCategorias = categorias === null && !erroCategorias;

  const buscarProduto = (categoriaId, marca = '') => {
    const parametros = new URLSearchParams({
      categoria: String(categoriaId)
    });

    if (marca) parametros.set('marca', marca);

    navigate(`/?${parametros.toString()}`);
    onClose();
  };

  const alternarCategoria = categoriaId => {
    setCategoriaAberta(atual =>
      atual === categoriaId ? null : categoriaId
    );
  };

  if (!isOpen) return null;

  return (
    <div className="voke-drawer-overlay" onClick={onClose}>
      <div
        className="voke-drawer-box"
        onClick={event => event.stopPropagation()}
      >
        <button
          className="voke-drawer-close-btn"
          onClick={onClose}
          aria-label="Fechar menu"
        >
          &times;
        </button>

        {/* Navegação principal */}
        <div className="voke-drawer-navigation">
          <div className="voke-menu-section-title">
            Departamentos
          </div>

          <ul className="voke-main-menu-list">
            {carregandoCategorias && (
              <li className="voke-submenu-item">
                Carregando departamentos...
              </li>
            )}

            {erroCategorias && (
              <li className="voke-submenu-item">
                {erroCategorias}
              </li>
            )}

            {!carregandoCategorias &&
              !erroCategorias &&
              categorias.map(categoria => (
                <li
                  className="voke-menu-item-main"
                  key={categoria.id}
                >
                  <div
                    className="voke-menu-trigger"
                    onClick={() => alternarCategoria(categoria.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={event => {
                      if (
                        event.key === 'Enter' ||
                        event.key === ' '
                      ) {
                        alternarCategoria(categoria.id);
                      }
                    }}
                    aria-expanded={
                      categoriaAberta === categoria.id
                    }
                  >
                    <span>{categoria.nombre}</span>

                    <span className="voke-menu-arrow">
                      {categoriaAberta === categoria.id ? '▲' : '▼'}
                    </span>
                  </div>

                  {categoriaAberta === categoria.id && (
                    <ul className="voke-submenu-list">
                      <li
                        className="voke-submenu-item-all"
                        onClick={() => buscarProduto(categoria.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={event => {
                          if (
                            event.key === 'Enter' ||
                            event.key === ' '
                          ) {
                            buscarProduto(categoria.id);
                          }
                        }}
                      >
                        Ver todos
                      </li>

                      <li className="voke-submenu-title">
                        Marcas
                      </li>

                      {Array.from(
                        new Set(
                          produtos
                            .filter(
                              produto =>
                                Number(produto.categoria_id) ===
                                Number(categoria.id)
                            )
                            .map(produto => produto.marca?.trim())
                            .filter(Boolean)
                        )
                      )
                        .sort((marcaA, marcaB) =>
                          marcaA.localeCompare(marcaB, 'pt-BR')
                        )
                        .map(marca => (
                          <li
                            className="voke-submenu-item"
                            key={marca}
                            onClick={() =>
                              buscarProduto(categoria.id, marca)
                            }
                            role="button"
                            tabIndex={0}
                            onKeyDown={event => {
                              if (
                                event.key === 'Enter' ||
                                event.key === ' '
                              ) {
                                buscarProduto(categoria.id, marca);
                              }
                            }}
                          >
                            {marca}
                          </li>
                        ))}

                      {produtos.every(
                        produto =>
                          Number(produto.categoria_id) !==
                            Number(categoria.id) ||
                          !produto.marca?.trim()
                      ) && (
                        <li className="voke-submenu-item">
                          Nenhuma marca cadastrada
                        </li>
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