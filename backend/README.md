# 🚀 API REST E-Commerce - Documentación Técnica

Backend robusto desarrollado en **Node.js con Express** y persistencia de datos en **PostgreSQL**, equipado con encriptación de contraseñas de seguridad (`bcryptjs`) y validación de sesiones mediante tokens **JWT (JSON Web Tokens)**.

---

## Variables de entorno

En desarrollo local, crea `backend/.env` con los datos de tu instalación local de PostgreSQL. En Render, configura los valores equivalentes en el apartado **Environment** del servicio backend. No subas `.env` al repositorio ni publiques contraseñas reales.

Ejemplo local (reemplaza los valores con los de tu entorno):
```text
PORT=3001
DB_USER=postgres
DB_PASSWORD=su_contraseña
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce
JWT_SECRET=una_frase_secreta_local
FRONTEND_URL=http://localhost:5173
```

El backend activa SSL cuando `DB_HOST` apunta a un servidor remoto. Render puede proporcionar `PORT`; localmente se usa `3001` si no se define.

## Ejecución local

Desde la carpeta `backend/`:

```bash
npm install
npm run dev
```

El arranque importa `migrations/add-product-brand.js` y completa la migración antes de iniciar Express en `http://localhost:3001`. La migración usa las variables de entorno activas en ese proceso. El frontend se inicia por separado desde `frontend/` con `npm run dev` y normalmente queda en `http://localhost:5173/`.

## Inicialización y migraciones de PostgreSQL

`migrations/add-product-brand.js` es la migración segura para una base ya creada. Agrega `productos.marca` y `productos.descripcion` si faltan, conserva los datos y asigna las marcas conocidas a productos semilla cuyo nombre coincide. El alta de imágenes sigue usando la tabla `producto_imagenes` existente.

También se puede ejecutar manualmente, desde `backend/`:

```bash
npm run migrate:product-brand
```

El comando modifica la base indicada por las variables de ese entorno: ejecutarlo localmente no modifica Render. En Render, el arranque de la aplicación ejecuta la misma migración con las variables configuradas para el servicio. Es idempotente, así que puede ejecutarse de nuevo sin volver a agregar columnas.

**No ejecutes `node init-db.js` sobre una base con información que quieras conservar.** Ese archivo contiene `DROP TABLE ... CASCADE` y reconstruye las tablas. Está destinado exclusivamente a inicializar o reiniciar una base descartable. `seed.js` inserta datos de ejemplo; ejecútalo solo al preparar una base vacía y no como parte de cada despliegue.

---

## 🛣️ Catálogo Completo de Endpoints

### 🔑 1. Autenticación y Usuarios (`/api/auth`)

#### 📝 Registrar un Nuevo Usuario
* **Método:** `POST`
* **URL:** `/api/auth/register`
* **Acceso:** Público
* **Cuerpo JSON Esperado:**
```json
{
  "email": "alberto.prueba@gmail.com",
  "contrasena": "Secreta123",
  "cpf_cnpj": "123.456.789-00",
  "nome_completo": "Alberto Guatume",
  "fecha_nacimiento": "1990-05-15",
  "sexo": "M",
  "telefono": "41999999999",
  "cep": "8324466",
  "direccion": "Rua Principal 123",
  "ciudad": "Curitiba",
  "perfil": "cliente"
}
```
* **Prueba rápida con `curl`:**
```bash
curl -X POST http://localhost:3001/api/auth/register -H "Content-Type: application/json" -d '{"email":"test@gmail.com","contrasena":"123","cpf_cnpj":"000.000.000-11","nome_completo":"Test User"}'
```

#### 🔑 Iniciar Sesión (Generar JWT)
* **Método:** `POST`
* **URL:** `/api/auth/login`
* **Acceso:** Público
* **Cuerpo JSON Esperado:**
```json
{
  "email": "alberto.prueba@gmail.com",
  "contrasena": "Secreta123"
}
```

---

### 📂 2. Categorías (`/api/categorias`)

#### 📋 Listar todas las Categorías
* **Método:** `GET`
* **URL:** `/api/categorias`
* **Acceso:** Público

#### ➕ Crear una Categoría
* **Método:** `POST`
* **URL:** `/api/categorias`
* **Acceso:** **Privado (Requiere Token JWT)**
* **Cabecera Requerida:** `Authorization: Bearer <TOKEN_JWT>`
* **Cuerpo JSON Esperado:**
```json
{
  "nombre": "Nuevos Gadgets"
}
```

---

### 🛍️ 3. Productos (`/api/produtos`)

#### 📋 Listar todos los Productos con Imágenes (`JOIN`)
* **Método:** `GET`
* **URL:** `/api/produtos`
* **Acceso:** Público

#### ➕ Crear un Nuevo Producto con su Colección de Imágenes
* **Método:** `POST`
* **URL:** `/api/produtos`
* **Acceso:** **Privado (Requiere Token JWT)**
* **Cuerpo JSON Esperado:**
```json
{
  "nombre": "TV 50 Pulgadas",
  "marca": "Samsung",
  "descripcion": "Televisor Smart TV de 50 pulgadas",
  "precio": 2800.00,
  "stock": 10,
  "categoriaId": 1,
  "imagenes": [
    "https://link-da-imagem.com",
    "https://link-da-imagem.com"
  ]
}
```

#### Administración de productos
El dashboard permite consultar, agregar y actualizar nombre, marca, descripción, categoría, precio, stock e imagen. Las imágenes se almacenan en `producto_imagenes`. La eliminación se bloquea si el producto está asociado a elementos de carrito o pedido; la API verifica esta condición además del botón del dashboard.

---

### 🛒 4. Carrito de Compras (`/api/carrinhos`)

#### 📋 Obtener el Carrito del Usuario Autenticado
* **Método:** `GET`
* **URL:** `/api/carrinhos`
* **Acceso:** **Privado (Requiere Token JWT)**
* **Ejemplo con `curl`:**
```bash
curl -X GET http://localhost:3001/api/carrinhos -H "Authorization: Bearer <SU_TOKEN_JWT>"
```

#### ➕ Agregar o Incrementar Producto en el Carrito
* **Método:** `POST`
* **URL:** `/api/carrinhos`
* **Acceso:** **Privado (Requiere Token JWT)**
* **Cuerpo JSON Esperado:**
```json
{
  "productoId": 1,
  "cantidad": 2
}
```

#### ❌ Remover un Producto del Carrito
* **Método:** `DELETE`
* **URL:** `/api/carrinhos/:productoId`
* **Acceso:** **Privado (Requiere Token JWT)**