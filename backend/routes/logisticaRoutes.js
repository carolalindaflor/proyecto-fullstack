const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { autenticarToken, autorizarAdmin } = require('../middlewares/authMiddleware');

// =========================================================================
// 1. VISTA DEL CLIENTE: CONSULTAR LÍNEA DE TIEMPO DE UN PEDIDO (GET)
// =========================================================================
router.get('/seguimiento/:id', autenticarToken, async (req, res) => {
    const { id } = req.params; // Puede ser el ID numérico del pedido

    try {
        // Consultamos los detalles básicos del pedido
        const pedidoQuery = `
            SELECT id, total, status_envio, fecha_pedido, cep, direccion, ciudad 
            FROM pedidos 
            WHERE id = $1 AND usuario_id = $2;
        `;
        const pedidoRes = await pool.query(pedidoQuery, [id, req.usuario.id]);

        if (pedidoRes.rows.length === 0) {
            return res.status(404).json({ error: "Pedido não encontrado no sistema." });
        }

        // Consultamos todo el historial de movimientos logísticos asociados
        const historialQuery = `
            SELECT id, estado_logistico, detalles, fecha_actualizacion 
            FROM seguimiento_envios 
            WHERE pedido_id = $1 
            ORDER BY fecha_actualizacion DESC;
        `;
        const historialRes = await pool.query(historialQuery, [id]);

        res.json({
            pedido: pedidoRes.rows[0],
            historial: historialRes.rows
        });
    } catch (error) {
        console.error("Error al obtener seguimiento:", error);
        res.status(500).json({ error: "Error interno al recuperar el estado del envío." });
    }
});

router.get('/mis-pedidos', autenticarToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.id, p.fecha_pedido, cp.nome_completo, u.email
            FROM pedidos p
            JOIN usuarios u ON u.id = p.usuario_id
            LEFT JOIN clientes_perfil cp ON cp.usuario_id = u.id
            WHERE p.usuario_id = $1
            ORDER BY p.fecha_pedido DESC
        `, [req.usuario.id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al listar pedidos del usuario:', error);
        res.status(500).json({ error: 'No se pudieron consultar tus pedidos.' });
    }
});

// =========================================================================
// 2. VISTA DEL ADMINISTRADOR: CAMBIAR ESTADO Y CREAR HISTORIAL (PUT)
// =========================================================================
router.put('/actualizar-estado/:id', autenticarToken, autorizarAdmin, async (req, res) => {
    const { id } = req.params;
    const { nuevoEstado, detallesHistorial } = req.body; 

    // Validamos que el estado enviado esté dentro de los estipulados por Voke
    const estadosValidos = ['Pendiente', 'Despachado', 'En camino', 'Entregado', 'Devuelto', 'No entregado'];
    if (!estadosValidos.includes(nuevoEstado)) {
        return res.status(400).json({ error: "Status de envio inválido." });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // A. Actualizamos el estado principal en la tabla pedidos
        const updatePedidoQuery = `
            UPDATE pedidos 
            SET status_envio = $1 
            WHERE id = $2 
            RETURNING id;
        `;
        const updateRes = await client.query(updatePedidoQuery, [nuevoEstado, id]);

        if (updateRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Pedido não encontrado." });
        }

        // B. Insertamos de forma automática la nueva fila en la línea de tiempo (seguimiento_envios)
        const insertSeguimientoQuery = `
            INSERT INTO seguimiento_envios (pedido_id, estado_logistico, detalles) 
            VALUES ($1, $2, $3);
        `;
        await client.query(insertSeguimientoQuery, [
            id, 
            nuevoEstado === 'Pendiente' ? 'Aguardando processamento' : 
            nuevoEstado === 'Despachado' ? 'Separado no centro de distribuição' : 
            nuevoEstado === 'En camino' ? 'Em rota de entrega' : 'Entregue ao destinatário',
            detallesHistorial || `O status del pedido foi atualizado para ${nuevoEstado}.`
        ]);

        await client.query('COMMIT');
        res.json({ mensaje: "¡Estado del pedido actualizado e historial logístico registrado!" });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error al actualizar logística:", error);
        res.status(500).json({ error: "Error interno del servidor al procesar el cambio logístico." });
    } finally {
        client.release();
    }
});
// =========================================================================
// 3. VISTA DEL ADMINISTRADOR: OBTENER TODOS LOS PEDIDOS REGISTRADOS (GET)
// =========================================================================
router.get('/pedidos-todos', autenticarToken, autorizarAdmin, async (req, res) => {
    try {
        const query = `
            SELECT p.id, p.total, p.metodo_pago, p.status_envio, p.estado_pago, p.fecha_pedido, p.ciudad, cp.nome_completo
            FROM pedidos p
            JOIN usuarios u ON p.usuario_id = u.id
            JOIN clientes_perfil cp ON cp.usuario_id = u.id
            ORDER BY p.fecha_pedido DESC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error("Error al obtener nómina de pedidos:", error);
        res.status(500).json({ error: "Error interno al recuperar listado de órdenes." });
    }
});

module.exports = router;