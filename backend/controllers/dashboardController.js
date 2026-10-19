const pool = require('../config/db');

// 1. OBTENER MÉTRICAS GENERALES DEL DASHBOARD (GET)
const obtenerMetricasGenerales = async (req, res) => {
    try {
        // A. Suma total de ventas (Finanzas)
        const ventasQuery = "SELECT COALESCE(SUM(total), 0.00) AS total_ventas FROM pedidos WHERE estado_pago = 'Pago Aprovado';";
        const ventasRes = await pool.query(ventasQuery);

        // B. CORRECCIÓN RADICAL: Cambiamos FILTER por una consulta de conteo clásica y directa
        const enviosQuery = `
            SELECT 
                SUM(CASE WHEN status_envio = 'Pendiente' THEN 1 ELSE 0 END) as pendientes,
                SUM(CASE WHEN status_envio = 'Despachado' THEN 1 ELSE 0 END) as despachados,
                SUM(CASE WHEN status_envio = 'En camino' THEN 1 ELSE 0 END) as en_camino,
                SUM(CASE WHEN status_envio = 'Entregado' THEN 1 ELSE 0 END) as entregados,
                SUM(CASE WHEN status_envio = 'Devuelto' THEN 1 ELSE 0 END) as devueltos,
                SUM(CASE WHEN status_envio = 'No entregado' THEN 1 ELSE 0 END) as no_entregados
            FROM pedidos;
        `;
        const enviosRes = await pool.query(enviosQuery);
        
        // Extraemos la fila de conteo y forzamos la conversión manual a números puros
        const rawLogistica = enviosRes.rows[0] || {};
        const logisticaLimpia = {
            pendientes: Number(rawLogistica.pendientes || 0),
            despachados: Number(rawLogistica.despachados || 0),
            en_camino: Number(rawLogistica.en_camino || 0),
            entregados: Number(rawLogistica.entregados || 0),
            devueltos: Number(rawLogistica.devueltos || 0),
            no_entregados: Number(rawLogistica.no_entregados || 0)
        };

        // C. Ventas agrupadas por Producto
        const ventasPorProductoQuery = `
            SELECT p.nombre, SUM(pe.cantidad) AS unidades_vendidas, SUM(pe.cantidad * pe.precio_historico) AS ingresos_totales
            FROM pedido_elementos pe
            JOIN productos p ON pe.producto_id = p.id
            JOIN pedidos ped ON pe.pedido_id = ped.id
            WHERE ped.estado_pago = 'Pago Aprovado'
            GROUP BY p.nombre;
        `;
        const productosRes = await pool.query(ventasPorProductoQuery);

        // D. Ventas agrupadas por Usuario
        const ventasPorUsuarioQuery = `
            SELECT cp.nome_completo, u.email, COUNT(p.id) AS total_pedidos, SUM(p.total) AS total_gastado
            FROM pedidos p
            JOIN usuarios u ON p.usuario_id = u.id
            JOIN clientes_perfil cp ON cp.usuario_id = u.id
            WHERE p.estado_pago = 'Pago Aprovado'
            GROUP BY cp.nome_completo, u.email;
        `;
        const usuariosRes = await pool.query(ventasPorUsuarioQuery);

        // E. Medición de Inventario
        const stockQuery = "SELECT nombre, stock, precio FROM productos ORDER BY stock ASC;";
        const stockRes = await pool.query(stockQuery);

        // ENVIAMOS EL JSON TOTALMENTE PROCESADO Y SANEADO
        res.json({
            totalVentas: parseFloat(ventasRes.rows[0]?.total_ventas || 0),
            logistica: logisticaLimpia, // <-- Enviamos el objeto con números puros garantizados
            ventasProductos: productosRes.rows,
            ventasUsuarios: usuariosRes.rows,
            inventarioStock: stockRes.rows
        });

    } catch (error) {
        console.error("Error al recopilar métricas del Dashboard:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
};

// 2. LISTAR CATEGORÍAS EN PANEL ADMINISTRATIVO (GET)
const listarCategoriasAdmin = async (req, res) => {
    try {
        const query = `
            SELECT c.id, c.nombre, COUNT(p.id) AS total_productos_vinculados, COALESCE(SUM(p.stock), 0) AS stock_total
            FROM categorias c
            LEFT JOIN productos p ON p.categoria_id = c.id
            GROUP BY c.id, c.nombre
            ORDER BY c.id ASC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error("Error al listar categorías:", error);
        res.status(500).json({ error: "Error interno al recuperar categorías administrativas." });
    }
};

// 3. AGREGAR NUEVA CATEGORÍA (POST)
const crearCategoriaAdmin = async (req, res) => {
    const { nombre } = req.body;
    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ error: "El nombre de la categoría es obligatorio." });
    }
    try {
        const query = "INSERT INTO categorias (nombre) VALUES (\$1) RETURNING *;";
        const result = await pool.query(query, [nombre.trim()]);
        res.status(201).json({ mensaje: "Categoría agregada con éxito.", categoria: result.rows[0] });
    } catch (error) {
        console.error("Error al crear categoría:", error);
        if (error.code === '23505') {
            return res.status(400).json({ error: "Esta categoría ya se encuentra registrada en la tienda." });
        }
        res.status(500).json({ error: "Error al insertar la nueva categoría en el catálogo." });
    }
};

// 4. ELIMINAR CATEGORÍA SIEMPRE Y CUANDO EL STOCK SEA CERO (DELETE)
const eliminarCategoriaAdmin = async (req, res) => {
    const { id } = req.params;

    try {
        // REGLA DE NEGOCIO ESTRICTA: Validar si existen artículos con existencias activas en esta categoría
        const verificarStockQuery = "SELECT nombre, stock FROM productos WHERE categoria_id = \$1 AND stock > 0;";
        const stockCheck = await pool.query(verificarStockQuery, [id]);

        if (stockCheck.rows.length > 0) {
            return res.status(400).json({ 
                error: `No se puede eliminar la categoría. Existen productos activos con stock mayor a cero (Ej: "${stockCheck.rows[0].nombre}", Stock: ${stockCheck.rows[0].stock}).` 
            });
        }

        // Si la validación de inventario en cero pasa con éxito, procedemos a remover de la base de datos
        const eliminarQuery = "DELETE FROM categorias WHERE id = \$1 RETURNING *;";
        const result = await pool.query(eliminarQuery, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "La categoría especificada no existe." });
        }

        res.json({ mensaje: "Categoría eliminada del catálogo exitosamente." });

    } catch (error) {
        console.error("Error al eliminar categoría de forma administrativa:", error);
        res.status(500).json({ error: "Error interno del servidor al procesar la baja de la categoría." });
    }
};

module.exports = {
    obtenerMetricasGenerales,
    listarCategoriasAdmin,
    crearCategoriaAdmin,
    eliminarCategoriaAdmin
};