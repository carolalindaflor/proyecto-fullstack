require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const productos = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'productos_data.json'), 'utf8')
);

async function migrarMarcaProductos({ cerrarPool = false } = {}) {
    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        await client.query('ALTER TABLE productos ADD COLUMN IF NOT EXISTS marca VARCHAR(100)');
        await client.query('ALTER TABLE productos ADD COLUMN IF NOT EXISTS descripcion TEXT');

        for (const producto of productos) {
            if (!producto.marca) continue;
            await client.query(
                'UPDATE productos SET marca = $1 WHERE nombre = $2 AND (marca IS NULL OR marca = $3)',
                [producto.marca, producto.nombre, '']
            );
        }

        await client.query('COMMIT');
        console.log('Migración completada: marca y descripción disponibles en productos; datos semilla actualizados.');
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        throw error;
    } finally {
        if (client) client.release();
        if (cerrarPool) await pool.end();
    }
}

if (require.main === module) {
    migrarMarcaProductos({ cerrarPool: true })
        .then(() => console.log('Migración de columnas de producto completada.'))
        .catch(error => {
            console.error('No se pudo completar la migración de productos:', error);
            process.exitCode = 1;
        });
}

module.exports = migrarMarcaProductos;
