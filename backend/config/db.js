const { Pool } = require('pg');

const variablesRequeridas = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_NAME'];
const variablesFaltantes = variablesRequeridas.filter(nombre => !process.env[nombre]);
if (variablesFaltantes.length > 0) {
    throw new Error(`Faltan variables de entorno de PostgreSQL: ${variablesFaltantes.join(', ')}`);
}

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    // 🚀 CONTROL EXPLICITO DE SSL PARA LA NUBE:
    // Si la base de datos es local ('localhost'), apaga el SSL para poder programar normal.
    // Si se ejecuta en internet (Render), inyecta la encriptación requerida por el servidor.
    ssl: (process.env.DB_HOST && process.env.DB_HOST !== 'localhost') 
        ? { rejectUnauthorized: false } 
        : false
});

// Exportamos únicamente la instancia del pool
module.exports = pool;