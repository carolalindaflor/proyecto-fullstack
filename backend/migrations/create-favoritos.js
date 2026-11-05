require('dotenv').config();
const pool = require('../config/db');

async function crearTablaFavoritos({ cerrarPool = false } = {}) {
    let client;

    try {
        client = await pool.connect();

        await client.query('BEGIN');

        await client.query(`
            CREATE TABLE IF NOT EXISTS favoritos (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER NOT NULL,
                producto_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                CONSTRAINT fk_favoritos_usuario
                    FOREIGN KEY (usuario_id)
                    REFERENCES usuarios(id)
                    ON DELETE CASCADE,

                CONSTRAINT fk_favoritos_producto
                    FOREIGN KEY (producto_id)
                    REFERENCES productos(id)
                    ON DELETE CASCADE,

                CONSTRAINT uq_favorito_usuario_producto
                    UNIQUE (usuario_id, producto_id)
            );
        `);

        await client.query('COMMIT');

        console.log('Migração concluída: tabela favoritos preparada.');

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        throw error;

    } finally {
        if (client) client.release();
        if (cerrarPool) await pool.end();
    }
}

if (require.main === module) {
    crearTablaFavoritos({ cerrarPool: true })
        .catch(error => {
            console.error('Erro ao criar tabela favoritos:', error);
            process.exitCode = 1;
        });
}

module.exports = crearTablaFavoritos;