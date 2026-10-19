require('dotenv').config();
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET debe estar configurado en el entorno del backend.');
}
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
app.set('trust proxy', 1);
const origenesPermitidos = new Set(
    (process.env.CORS_ORIGINS || 'https://jagq68.github.io')
        .split(',')
        .map(origen => origen.trim())
        .filter(Boolean)
);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        const origenLocalPermitido = process.env.NODE_ENV !== 'production'
            && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
        if (origenesPermitidos.has(origin) || origenLocalPermitido) return callback(null, true);

        callback(new Error('Origen no permitido por la política CORS.'));
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
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
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
