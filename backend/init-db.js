require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

const crearTablasSQL = `
    -- 1. LIMPIEZA PREVIA (En orden inverso de dependencias para evitar errores de Foreign Keys)
    DROP TABLE IF EXISTS metricas_tienda CASCADE;
    DROP TABLE IF EXISTS seguimiento_envios CASCADE;
    DROP TABLE IF EXISTS pedido_elementos CASCADE;
    DROP TABLE IF EXISTS pedidos CASCADE;
    DROP TABLE IF EXISTS carrito_elementos CASCADE;
    DROP TABLE IF EXISTS carritos CASCADE;
    DROP TABLE IF EXISTS clientes_perfil CASCADE;
    DROP TABLE IF EXISTS usuarios CASCADE;
    DROP TABLE IF EXISTS producto_imagenes CASCADE;
    DROP TABLE IF EXISTS productos CASCADE;
    DROP TABLE IF EXISTS categorias CASCADE;

    -- 2. CREACIÓN DE TABLAS EXISTENTES
    CREATE TABLE categorias (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE
    );

    -- TABLA PRODUCTOS (Corregida: Se añade la columna STOCK para el control de inventario)
    CREATE TABLE productos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        marca VARCHAR(100),
        descripcion TEXT,
        precio DECIMAL(10, 2) NOT NULL,
        stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0), -- <-- COLUMNA CRUCIAL PARA REBAJAR INVENTARIO
        categoria_id INT REFERENCES categorias(id) ON DELETE SET NULL
    );

    CREATE TABLE producto_imagenes (
        id SERIAL PRIMARY KEY,
        producto_id INT REFERENCES productos(id) ON DELETE CASCADE,
        url TEXT NOT NULL
    );

    CREATE TABLE usuarios (
        id SERIAL PRIMARY KEY,
        email VARCHAR(150) NOT NULL UNIQUE,
        contrasena VARCHAR(255) NOT NULL,
        perfil VARCHAR(30) NOT NULL DEFAULT 'cliente',
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE clientes_perfil (
        id SERIAL PRIMARY KEY,
        usuario_id INT UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
        cpf_cnpj VARCHAR(20) UNIQUE NOT NULL,
        nome_completo VARCHAR(255) NOT NULL,
        fecha_nacimiento DATE,
        sexo CHAR(1) CHECK (sexo IN ('M', 'F', 'O')),
        telefono VARCHAR(20),
        cep VARCHAR(15),
        direccion TEXT,
        ciudad VARCHAR(100)
    );

    CREATE TABLE carritos (
        id SERIAL PRIMARY KEY,
        usuario_id INT UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE carrito_elementos (
        id SERIAL PRIMARY KEY,
        carrito_id INT REFERENCES carritos(id) ON DELETE CASCADE,
        producto_id INT REFERENCES productos(id) ON DELETE CASCADE,
        cantidad INT NOT NULL CHECK (cantidad > 0),
        UNIQUE(carrito_id, producto_id)
    );

    -- 3. NUEVAS TABLAS DE LA SIMULACIÓN DE VOKE.COM BRASIL
       -- TABLA PEDIDOS (Corregida: Se añaden las columnas logísticas y financieras para el Checkout)
    CREATE TABLE pedidos (
        id SERIAL PRIMARY KEY,
        usuario_id INT REFERENCES usuarios(id) ON DELETE RESTRICT,
        total DECIMAL(10, 2) NOT NULL,
        metodo_pago VARCHAR(50) NOT NULL, -- 'Pix', 'Credito', 'Debito'
        cuotas INT NOT NULL DEFAULT 1 CHECK (cuotas >= 1 AND cuotas <= 10), -- <-- PARCELAS
        estado_pago VARCHAR(30) NOT NULL DEFAULT 'Aguardando Pagamento', -- 'Pago Aprovado', 'Recusado'
        status_envio VARCHAR(50) NOT NULL DEFAULT 'Pendiente', -- 'Pendiente', 'Despachado', 'En camino', 'Entregado'
        clave_rastreo VARCHAR(50) UNIQUE, -- Removido el NOT NULL estricto si se genera de forma asíncrona o autoincremental
        cep VARCHAR(15) NOT NULL, -- <-- DIRECCIÓN HISTÓRICA DEL DESPACHO
        direccion TEXT NOT NULL,
        ciudad VARCHAR(100) NOT NULL,
        fecha_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE pedido_elementos (
        id SERIAL PRIMARY KEY,
        pedido_id INT REFERENCES pedidos(id) ON DELETE CASCADE,
        producto_id INT REFERENCES productos(id) ON DELETE SET NULL,
        cantidad INT NOT NULL CHECK (cantidad > 0),
        precio_historico DECIMAL(10, 2) NOT NULL -- Resguarda el precio exacto cobrado en ese momento
    );

    CREATE TABLE seguimiento_envios (
        id SERIAL PRIMARY KEY,
        pedido_id INT REFERENCES pedidos(id) ON DELETE CASCADE,
        estado_logistico VARCHAR(100) NOT NULL, -- 'Separando estoque', 'Em rota de entrega', 'Entregue'
        detalles TEXT,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE metricas_tienda (
        id SERIAL PRIMARY KEY,
        tipo_evento VARCHAR(50) NOT NULL, -- 'visita_pagina', 'clique_producto', 'venda_concluida'
        producto_id INT REFERENCES productos(id) ON DELETE SET NULL,
        monto_venta DECIMAL(10, 2) DEFAULT 0.00,
        fecha_evento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`;

async function inicializarBaseDatos() {
    try {
        console.log('⏳ Conectando a PostgreSQL y recreando el esquema completo (11 tablas)...');
        await pool.query(crearTablasSQL);
        console.log('✅ ¡Esquema integral de base de datos Voke-Simulación creado exitosamente!');
    } catch (error) {
        console.error('❌ Error al inicializar las tablas de la base de datos:', error);
    } finally {
        await pool.end();
    }
}

inicializarBaseDatos();