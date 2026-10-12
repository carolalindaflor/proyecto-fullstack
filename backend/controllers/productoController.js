const { Pool } = require('pg');

// const pool = new Pool({
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     host: process.env.DB_HOST,
//     port: process.env.DB_PORT,
//     database: process.env.DB_NAME
// });
const pool = require('../config/db'); // Importación limpia y unificada


// GET /api/produtos (Listar todos con sus imágenes)
const obtenerProductos = async (req, res) => {
    try {
        // Hacemos una consulta estructurando las imágenes de la tabla secundaria en un array JSON
        const query = `
            SELECT p.*, COALESCE(json_agg(pi.url) FILTER (WHERE pi.url IS NOT NULL), '[]') AS imagenes,
                (SELECT COUNT(*)::int FROM carrito_elementos ce WHERE ce.producto_id = p.id) AS usos_carrito,
                (SELECT COUNT(*)::int FROM pedido_elementos pe WHERE pe.producto_id = p.id) AS usos_pedidos
            FROM productos p
            LEFT JOIN producto_imagenes pi ON p.id = pi.producto_id
            GROUP BY p.id
            ORDER BY p.id ASC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error("Error al obtener productos:", error);
        res.status(500).json({ error: "Error interno del servidor al obtener productos." });
    }
};

// GET /api/produtos/:id (Buscar un producto por ID con sus imágenes)
const obtenerProductoPorId = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT p.*, COALESCE(json_agg(pi.url) FILTER (WHERE pi.url IS NOT NULL), '[]') AS imagenes
            FROM productos p
            LEFT JOIN producto_imagenes pi ON p.id = pi.producto_id
            WHERE p.id = $1
            GROUP BY p.id;
        `;
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Producto no encontrado." });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error al obtener el producto:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
};

// POST /api/produtos (Crear producto e insertar sus imágenes - Solo admin)
const crearProducto = async (req, res) => {
    const { nombre, marca, descripcion = '', precio, stock = 0, categoriaId, imagenes } = req.body;
    if (!nombre?.trim() || !marca?.trim() || !categoriaId || !Number.isFinite(Number(precio)) || Number(precio) <= 0) {
        return res.status(400).json({ error: "Nombre, marca, categoría y un precio mayor que cero son obligatorios." });
    }
    if (!Number.isInteger(Number(stock)) || Number(stock) < 0) {
        return res.status(400).json({ error: "El stock debe ser un número entero igual o mayor que cero." });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Insertar el producto base
        const queryProducto = `
            INSERT INTO productos (nombre, marca, descripcion, precio, stock, categoria_id)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
        `;
        const resProd = await client.query(queryProducto, [nombre.trim(), marca.trim(), descripcion.trim(), precio, stock, categoriaId]);
        const nuevoProducto = resProd.rows[0];

        // 2. Insertar las imágenes en la tabla secundaria si vienen en la petición
        if (imagenes && Array.isArray(imagenes)) {
            for (const url of imagenes) {
                await client.query('INSERT INTO producto_imagenes (producto_id, url) VALUES (\$1, \$2)', [nuevoProducto.id, url]);
            }
        }

        await client.query('COMMIT');
        
        // Devolvemos el producto con sus imágenes para la respuesta
        nuevoProducto.imagenes = imagenes || [];
        res.status(201).json({ mensaje: "Producto creado con éxito", producto: nuevoProducto });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error al crear producto:", error);
        res.status(500).json({ error: "Error interno del servidor al crear producto." });
    } finally {
        client.release();
    }
};

// PUT /api/produtos/:id (Actualizar producto e imágenes - Solo admin)
const actualizarProducto = async (req, res) => {
    const { id } = req.params;
    const { nombre, marca, descripcion = '', precio, stock, categoriaId, imagenes } = req.body;

    if (!nombre?.trim() || !marca?.trim() || !categoriaId || !Number.isFinite(Number(precio)) || Number(precio) <= 0) {
        return res.status(400).json({ error: "Nombre, marca, categoría y un precio mayor que cero son obligatorios." });
    }
    if (!Number.isInteger(Number(stock)) || Number(stock) < 0) {
        return res.status(400).json({ error: "El stock debe ser un número entero igual o mayor que cero." });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Actualizar datos base del producto
        const queryProducto = `
            UPDATE productos 
            SET nombre = $1, marca = $2, descripcion = $3, precio = $4, stock = $5, categoria_id = $6
            WHERE id = $7 RETURNING *;
        `;
        const resProd = await client.query(queryProducto, [nombre.trim(), marca.trim(), descripcion.trim(), precio, stock, categoriaId, id]);
        
        if (resProd.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Producto no encontrado." });
        }

        // 2. Si se envían nuevas imágenes, borramos las anteriores e insertamos las nuevas
        if (imagenes && Array.isArray(imagenes)) {
            await client.query('DELETE FROM producto_imagenes WHERE producto_id = \$1', [id]);
            for (const url of imagenes) {
                await client.query('INSERT INTO producto_imagenes (producto_id, url) VALUES (\$1, \$2)', [id, url]);
            }
        }

        await client.query('COMMIT');
        const productoActualizado = resProd.rows[0];
        productoActualizado.imagenes = imagenes || [];
        
        res.json({ mensaje: "Producto actualizado con éxito", producto: productoActualizado });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error al actualizar producto:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    } finally {
        client.release();
    }
};

// DELETE /api/produtos/:id (Eliminar producto y sus imágenes en cascada - Solo admin)
const eliminarProducto = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const producto = await client.query('SELECT id FROM productos WHERE id = $1 FOR UPDATE', [id]);
        if (producto.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Producto no encontrado." });
        }

        const referencias = await client.query(`
            SELECT
                EXISTS (SELECT 1 FROM carrito_elementos WHERE producto_id = $1) AS en_carrito,
                EXISTS (SELECT 1 FROM pedido_elementos WHERE producto_id = $1) AS en_pedido
        `, [id]);
        if (referencias.rows[0].en_carrito || referencias.rows[0].en_pedido) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: "No se puede eliminar: el producto está asociado a un carrito o pedido." });
        }

        const result = await client.query('DELETE FROM productos WHERE id = $1 RETURNING *', [id]);
        await client.query('COMMIT');
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Producto no encontrado." });
        }
        res.json({ mensaje: "Producto eliminado con éxito de la base de datos." });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error al eliminar producto:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    } finally {
        client.release();
    }
};

module.exports = {
    obtenerProductos,
    obtenerProductoPorId,
    crearProducto,
    actualizarProducto,
    eliminarProducto
};