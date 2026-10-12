# 🚀 API REST E-Commerce - Documentación Técnica

Backend robusto desarrollado en **Node.js con Express** y persistencia de datos en **PostgreSQL**, equipado con encriptación de contraseñas de seguridad (`bcryptjs`) y validación de sesiones mediante tokens **JWT (JSON Web Tokens)**.

---

## 🛠️ Variables de Entorno (.env)
Asegúrese de poseer un archivo `.env` configurado en la raíz de su backend con los siguientes parámetros:
```text
PORT=3001
DB_USER=postgres
DB_PASSWORD=su_contraseña
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecomerce_deb
JWT_SECRET=SuFraseSecretaSegura
FRONTEND_URL=http://localhost:5173
```

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

#### Migración de datos de producto
Para una base existente, ejecutar desde `backend/`:
```bash
npm run migrate:product-brand
```
El script `backend/migrations/add-product-brand.js` agrega `productos.marca` y `productos.descripcion` si todavía no existen. No elimina tablas ni registros. La imagen se guarda en la tabla existente `producto_imagenes`; no requiere una modificación de esquema. El dashboard permite consultar y editar productos, y bloquea la eliminación cuando el producto está asociado a un carrito o pedido.

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