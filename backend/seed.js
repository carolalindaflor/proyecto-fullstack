require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

async function poblarBaseDatos() {
    try {
        console.log('⏳ Cargando archivo JSON de productos...');
        const jsonPath = path.join(__dirname, 'productos_data.json');
        const dataRaw = fs.readFileSync(jsonPath, 'utf8');
        const productos = JSON.parse(dataRaw);

        // 1. Insertar Categorías Iniciales Estrictas
        console.log('⏳ Insertando categorías iniciales...');
        const categoriasBase = ['Cuadernos', 'Escritorios', 'Smartphones', 'Tabletas', 'Monitores'];
        for (const cat of categoriasBase) {
            await pool.query('INSERT INTO categorias (nombre) VALUES (\$1) ON CONFLICT (nombre) DO NOTHING;', [cat]);
        }

        console.log(`⏳ Insertando ${productos.length} productos y distribuyendo sus imágenes...`);
        // 2. Insertar Productos con STOCK disponible para la pasarela de pagos e Imágenes mapeados
        for (const prod of productos) {
            const queryProducto = `
                INSERT INTO productos (nombre, marca, precio, stock, categoria_id)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id;
            `;
            
            // Inyectamos un inventario semilla de 20 unidades a cada artículo del JSON
            const stockSemilla = 20; 

            const resProd = await pool.query(queryProducto, [
                prod.nombre, 
                prod.marca || null,
                prod.precio, 
                stockSemilla, 
                prod.categoryId
            ]);
            const productoIdAsignado = resProd.rows[0].id;

            if (prod.imagenes && prod.imagenes.length > 0) {
                for (const urlImg of prod.imagenes) {
                    const queryImagen = `
                        INSERT INTO producto_imagenes (producto_id, url) 
                        VALUES ($1, $2);
                    `;
                    await pool.query(queryImagen, [productoIdAsignado, urlImg]);
                }
            }
        }

        // 2. Insertar Productos e Imágenes mapeados
        // for (const prod of productos) {
        //     const queryProducto = `
        //         INSERT INTO productos (nombre, precio, categoria_id) 
        //         VALUES ($1, $2, $3) 
        //         RETURNING id;
        //     `;
        //     const resProd = await pool.query(queryProducto, [prod.nombre, prod.precio, prod.categoryId]);
        //     const productoIdAsignado = resProd.rows[0].id;

        //     if (prod.imagenes && prod.imagenes.length > 0) {
        //         for (const urlImg of prod.imagenes) {
        //             const queryImagen = `
        //                 INSERT INTO producto_imagenes (producto_id, url) 
        //                 VALUES ($1, $2);
        //             `;
        //             await pool.query(queryImagen, [productoIdAsignado, urlImg]);
        //         }
        //     }
        // }

        console.log('✅ ¡La base de datos se ha poblado exitosamente con todas las categorías, productos e imágenes!');
    } catch (error) {
        console.error('❌ Error inyectando los datos semilla:', error);
    } finally {
        await pool.end();
    }
}

poblarBaseDatos();