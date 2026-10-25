# Sistema E-commerce Voke Brasil

Simulación fullstack de una tienda de productos electrónicos, desarrollada con React, Node.js, Express y PostgreSQL. El proyecto incluye catálogo, categorías y marcas dinámicas, cuentas de cliente, carrito, pagos simulados, seguimiento logístico y panel administrativo.

## User Stories

| Usuário | Ação | Descrição |
| :--- | :--- | :--- |
| Visitante | eu posso... | Visualizar todos os produtos disponíveis na loja |
| Visitante | eu posso... | Consultar os detalhes de um produto, incluindo preço, descrição e imagem |
| Visitante | eu posso... | Pesquisar produtos por nome ou categoria |
| Usuário cadastrado | eu posso... | Criar uma conta e fazer login |
| Usuário (logado) | eu posso... | Adicionar produtos ao meu carrinho |
| Usuário (logado) | eu posso... | Alterar a quantidade ou remover produtos do carrinho |
| Usuário (logado) | eu posso... | Finalizar uma compra (checkout) |
| Administrador | eu posso... | Cadastrar novos produtos |
| Administrador | eu posso... | Atualizar as informações e os preços dos produtos |
| Administrador | eu posso... | Excluir produtos do catálogo |
| Administrador | eu posso... | Consultar e gerenciar os registros do sistema, conforme as permissões definidas |

## Tecnologías

- Frontend: React y Vite, con HashRouter y CSS propio.
- Backend: Node.js y Express.
- Base de datos: PostgreSQL.
- Frontend publicado en GitHub Pages; API y base PostgreSQL desplegadas con Render.

## Controles de seguridad

- El registro público crea cuentas con perfil `cliente`; el perfil enviado por el navegador se ignora.
- Las operaciones administrativas requieren JWT y un rol `admin` verificado contra PostgreSQL en cada petición.
- Las rutas de cuenta exigen autenticación y solo permiten actuar sobre el ID del usuario autenticado.
- El seguimiento por ID requiere sesión y solo devuelve pedidos del usuario propietario. El rastreo por código y los endpoints de autenticación tienen límites de solicitudes.
- CORS compara orígenes exactos. Para agregar un origen de producción, configura `CORS_ORIGINS` en Render como una lista separada por comas.
- PostgreSQL y JWT requieren variables de entorno explícitas; no hay contraseña `root` de respaldo.
- Login, registro y rastreo público tienen límites de solicitudes; el servidor de desarrollo usa `node --watch` sin `nodemon`.

Estos controles reducen riesgos, pero no sustituyen una auditoría profesional, copias de seguridad ni la rotación de credenciales si se sospecha una exposición.

## Requisitos locales

- Node.js 22 o compatible con Vite 8 y `node --watch`, más npm.
- PostgreSQL local si se desea usar una base de datos local.
- Variables de entorno propias para el backend, guardadas en `backend/.env`. No subir ese archivo ni compartir sus contraseñas.

## Ejecutar en VS Code

Abre dos terminales integradas desde la raíz del repositorio.

Terminal 1, iniciar API y conectar con la base configurada en `backend/.env`:

```bash
cd backend
npm install
npm run dev
```

El backend ejecuta la migración idempotente del esquema antes de abrir el puerto. Localmente, utiliza la base indicada por `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD`.

Terminal 2, iniciar la interfaz:

```bash
cd frontend
npm install
npm run dev
```

Vite mostrará una URL local, normalmente `http://localhost:5173/`. Para verla en una pestaña dentro de VS Code, abre la paleta con `Ctrl+Shift+P`, ejecuta `Simple Browser: Show` y escribe esa URL. Para detener un servidor, vuelve a su terminal y pulsa `Ctrl+C`.

El frontend local usa la API local en `http://localhost:3001/api`. Por eso, para probar login, catálogo y administración con PostgreSQL local, deben estar activos tanto el backend como el frontend.

Desde `frontend/`, `npm run lint` ejecuta ESLint y `npm run build` ejecuta primero ESLint y luego Vite. Los archivos identificados como copias antiguas (`*old*`) se excluyen del lint; los componentes activos siguen verificados. Los errores del linter no suelen impedir que `vite build` compile, por eso el script de build encadena ahora ambos pasos.

## Base de datos y migraciones

La migración para las columnas de marca y descripción está en [backend/migrations/add-product-brand.js](backend/migrations/add-product-brand.js). Agrega `marca` y `descripcion` a `productos` si no existen, conserva el resto de los datos y completa marcas para productos que coinciden con el inventario semilla. Las imágenes continúan en `producto_imagenes`; no se agregó una tabla de imágenes nueva.

Para ejecutar la migración manualmente desde `backend/`:

```bash
npm run migrate:product-brand
```

El comando usa las variables disponibles en ese entorno. Si lo ejecutas localmente, modifica la base local configurada en `backend/.env`; no cambia la base de Render. En el backend, `npm run dev` y `npm start` también ejecutan la migración durante el arranque, antes de aceptar peticiones.

**No ejecutes `node init-db.js` sobre una base con datos que quieras conservar.** Ese script elimina y vuelve a crear las tablas. Solo debe usarse para crear/resetear una base descartable. `seed.js` carga el inventario de ejemplo y debe ejecutarse únicamente cuando se quiera poblar una base preparada para ese fin.

Las ventas del dashboard salen de pedidos persistidos en PostgreSQL, no del estado de sesión del navegador. Se corrigió el simulador que sobrescribía el estado de pago con el estado de entrega; el backend separa ahora pago (`estado_pago`) y envío (`status_envio`). La migración de arranque repara de forma idempotente filas antiguas afectadas, tanto en local como en Render, sin borrar pedidos ni importes.

## Productos en el dashboard

Desde el panel administrativo se pueden consultar productos y agregar o editar nombre, marca, descripción, precio, stock, categoría e imagen. Las marcas del menú se obtienen de los productos registrados en cada categoría. Un producto no se puede eliminar si está referenciado por un carrito o pedido; la API también aplica esa protección.

Para registrar un producto por API, se requiere una sesión administrativa y un cuerpo que incluya `nombre`, `marca`, `descripcion`, `precio`, `stock`, `categoriaId` e `imagenes`. La documentación de endpoints está en [backend/README.md](backend/README.md).

## Despliegue

### Backend y base de datos en Render

El servicio backend debe tener configuradas en Render sus variables de entorno de PostgreSQL y JWT. No copies contraseñas al repositorio ni al README. Al arrancar la nueva versión del backend, la migración se ejecuta con las credenciales configuradas en Render. Si el servicio despliega automáticamente desde `main`, publicar un commit inicia el despliegue; si no, inicia el deploy desde el panel de Render.

La aplicación ya desplegada en Render atiende en:

```text
https://proyecto-fullstack-mj38.onrender.com
```

### Frontend en GitHub Pages

Para compilar y publicar el frontend desde la raíz del repositorio:

```bash
cd frontend
npm install
npm run deploy
```

La publicación utiliza la rama `gh-pages`. La aplicación alojada fuera de `localhost` configura el cliente API para usar Render.

## Credenciales de evaluación

- Administrador: `admin@voke.com`. La contraseña no se documenta aquí; usa la establecida para la instancia de evaluación.
- Cliente: registrar una cuenta desde la interfaz.
