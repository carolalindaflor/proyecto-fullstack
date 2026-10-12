require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { iniciarSimuladorLogistico } = require('./config/simuladorLogistico');
const migrarMarcaProductos = require('./migrations/add-product-brand');

// IMPORTAR TODAS LAS RUTAS
const authRoutes = require('./routes/authRoutes');
const categoriaRoutes = require('./routes/categoriaRoutes');
const productoRoutes = require('./routes/productoRoutes');
const carritoRoutes = require('./routes/carritoRoutes'); 
const pedidoRoutes = require('./routes/pedidoRoutes');
const pagoRoutes = require('./routes/pagoRoutes'); 
const dashboardRoutes = require('./routes/dashboardRoutes'); 
const chatbotRoutes = require('./routes/chatbotRoutes'); 
const logisticaRoutes = require('./routes/logisticaRoutes');

const app = express();
// 1. Declaramos la lista de servidores autorizados a consumir datos
// const origenesPermitidos = [
//   'http://localhost:5173',          // Tu desarrollo en la laptop
//   'http://127.0.0.1:5173',         // Tu desarrollo local por IP
//   'https://github.io'       // Tu tienda oficial publicada en internet
// ];

// 2. Aplicamos la función validadora adaptativa de origen cruzado
// 🚀 REGLA DE SEGURIDAD UNIVERSAL PARA ENTORNO DE PRODUCCIÓN Y LOCAL
app.use(cors({
    origin: function (origin, callback) {
        // 1. Si la petición es interna del mismo servidor (sin origin) o viene de tu laptop
        if (!origin || 
            origin.startsWith('http://localhost:') || 
            origin.startsWith('http://127.0.0.1:') || 
            // 2. ⚡ FILTRO EXCLUSIVO DE INTERNET: Autoriza de golpe tu perfil oficial de GitHub Pages
            origin.startsWith('https://jagq68.github.io')) {
            
            callback(null, true); // ✅ Permitido de forma legítima
        } else {
            callback(new Error('Bloqueado por políticas de CORS de Voke')); // ❌ Bloqueado por seguridad
        }
    },
    credentials: true,               // Permite el intercambio seguro de tokens y cookies de sesión
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// app.use(cors({ 101026
//     origin: 'http://localhost:5173', // El puerto exacto donde corre tu frontend  
//     credentials: true,               // Permite el intercambio seguro de tokens y contraseñas
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization']
// }));
//app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'root',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ecommerce',//102026
    // 🚀 LÍNEA CLAVE: Si detecta que está corriendo en Render (porque tiene DB_HOST externo), activa el SSL seguro
    ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost' 
        ? { rejectUnauthorized: false } 
        : false
});

// ==========================================
// 2. DECLARACIÓN DE RUTAS DE LA API
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/produtos', productoRoutes);
app.use('/api/carrinhos', carritoRoutes); 
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/pagos', pagoRoutes); 
app.use('/api/dashboard', dashboardRoutes); 
app.use('/api/chatbot', chatbotRoutes); 
app.use('/api/logistica', logisticaRoutes);

// Ruta de prueba segura
app.get('/api/prueba', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ 
            mensaje: "¡API de tu e-commerce funcionando!", 
            db_conexion: true,
            hora_servidor: result.rows[0].now 
        });
    } catch (error) {
        res.json({ 
            mensaje: "¡Express funciona bien!, pero PostgreSQL aún no está configurado.", 
            db_conexion: false,
            error_detalle: error.message 
        });
    }
});

// ==========================================
// 3. MIDDLEWARE DE MANEJO DE ERRORES (SIEMPRE AL FINAL)
// ==========================================
app.use((err, req, res, next) => {
    console.error("🔴 Error Detectado en la Arquitectura:", err.stack);
    
    if (err.code === '23505') {
        return res.status(400).json({ error: "Restricción de base de datos: El registro ya existe." });
    }

    res.status(500).json({ 
        error: "Ocurrió un error interno en el servidor",
        detalles: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// ==========================================
// 4. ENCENDIDO DEL SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3001;

migrarMarcaProductos()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Servidor backend escuchando en: http://localhost:${PORT}`);
            iniciarSimuladorLogistico();
        });
    })
    .catch(error => {
        console.error('No se pudo preparar el esquema de productos:', error);
        process.exit(1);
    });
//respaldo 
// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const { Pool } = require('pg');
// const app = express();
// const { iniciarSimuladorLogistico } = require('./config/simuladorLogistico');

// //
// app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
// app.use(express.json());

// // IMPORTAR TODAS LAS RUTAS
// const authRoutes = require('./routes/authRoutes');
// const categoriaRoutes = require('./routes/categoriaRoutes');
// const productoRoutes = require('./routes/productoRoutes');
// const carritoRoutes = require('./routes/carritoRoutes'); // <-- Importación agregada
// const pedidoRoutes = require('./routes/pedidoRoutes');
// const pagoRoutes = require('./routes/pagoRoutes'); // <-- Importar rutas de pago
// const dashboardRoutes = require('./routes/dashboardRoutes'); // <-- Importar Dashboard
// const chatbotRoutes = require('./routes/chatbotRoutes'); // <-- Importar Chatbot

// // ENGANCHAR LAS RUTAS A LA API
// app.use('/api/auth', authRoutes);
// app.use('/api/categorias', categoriaRoutes);
// app.use('/api/produtos', productoRoutes);
// app.use('/api/carrinhos', carritoRoutes); // <-- Ruta registrada con éxito
// app.use('/api/pedidos', pedidoRoutes);
// app.use('/api/pagos', pagoRoutes); // <-- Registrar endpoint /api/pagos
// app.use('/api/dashboard', dashboardRoutes); // <-- Registrar Dashboard
// app.use('/api/chatbot', chatbotRoutes); // <-- Registrar Chatbot


// // Configuración de PostgreSQL
// const pool = new Pool({
//     user: process.env.DB_USER || 'postgres',
//     password: process.env.DB_PASSWORD || 'root',
//     host: process.env.DB_HOST || 'localhost',
//     port: process.env.DB_PORT || 5432,
//     database: process.env.DB_NAME || 'ecommerce'
// });

// // RUTA DE PRUEBA SEGURA
// app.get('/api/prueba', async (req, res) => {
//     try {
//         const result = await pool.query('SELECT NOW()');
//         res.json({ 
//             mensaje: "¡API de tu e-commerce funcionando!", 
//             db_conexion: true,
//             hora_servidor: result.rows.now 
//         });
//     } catch (error) {
//         res.json({ 
//             mensaje: "¡Express funciona bien!, pero PostgreSQL aún no está configurado.", 
//             db_conexion: false,
//             error_detalle: error.message 
//         });
//     }
// });

// const PORT = process.env.PORT || 3001;

// // MIDDLEWARE GLOBAL DE MANEJO DE ERRORES (Mantiene limpio tu código de caídas inesperadas)
// app.use((err, req, res, next) => {
//     console.error("🔴 Error Detectado en la Arquitectura:", err.stack);
    
//     // Si es un error de violación de llave única de PostgreSQL (ej. email duplicado)
//     if (err.code === '23505') {
//         return res.status(400).json({ error: "Restricción de base de datos: El registro ya existe." });
//     }

//     res.status(500).json({ 
//         error: "Ocurrió un error interno en el servidor",
//         detalles: process.env.NODE_ENV === 'development' ? err.message : {}
//     });
// });

// app.listen(PORT, () => {
//     console.log(`🚀 Servidor backend escuchando en: http://localhost:${PORT}`);
//     // ENCENDER EL SIMULADOR LOGÍSTICO AUTOMÁTICO
//     iniciarSimuladorLogistico();
// });