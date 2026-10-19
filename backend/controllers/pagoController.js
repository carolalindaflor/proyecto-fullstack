const pool = require('../config/db');

// POST /api/pagos/finalizar
const procesarPagoSimulado = async (req, res) => {
    const usuarioId = req.usuario.id; 
    
    const { items, total, metodo_pago, cuotas, logistica, detallesTarjeta } = req.body;
    const { cep, direccion, ciudad } = logistica || {};

    if (!metodo_pago || !cep || !direccion || !ciudad || !items || items.length === 0) {
        return res.status(400).json({ error: "Faltan datos obligatorios de despacho, artículos o método de pago." });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. OBTENER EL EMAIL DEL USUARIO PARA EL RECIBO DIGITAL
        const userQuery = "SELECT email FROM usuarios WHERE id = \$1;";
        const userRes = await client.query(userQuery, [usuarioId]);
        const emailCliente = userRes.rows[0]?.email || 'correo_registrado@voke.com';

        // 2. CONTROL DE INVENTARIO Y REBAJA DE STOCK EN POSTGRESQL
        for (const item of items) {
            const idProd = item.producto_id || item.id;
            const cantidadComprada = item.cantidad || 1;

            const prodQuery = "SELECT stock, nombre FROM productos WHERE id = \$1 FOR UPDATE;";
            const prodRes = await client.query(prodQuery, [idProd]);

            if (prodRes.rows.length === 0) {
                throw new Error(`O produto com ID ${idProd} não existe no catálogo.`);
            }

            const producto = prodRes.rows[0];

            if (producto.stock < cantidadComprada) {
                throw new Error(`Estoque insuficiente para "${producto.nombre}". Disponível: ${producto.stock}`);
            }

            await client.query("UPDATE productos SET stock = stock - \$1 WHERE id = \$2", [cantidadComprada, idProd]);
        }

        // 3. ACTUALIZACIÓN PERMANENTE DEL PERFIL DEL CLIENTE
        const updatePerfilQuery = `
            UPDATE clientes_perfil 
            SET cep = $1, direccion = $2, ciudad = $3 
            WHERE usuario_id = $4;
        `;
        await client.query(updatePerfilQuery, [cep.trim(), direccion.trim(), ciudad.trim(), usuarioId]);

        // 4. REGISTRO DE LA ORDEN DE COMPRA (CORREGIDO: 'Pago Aprovado' con O mayúscula)
        const estadoPagoInicial = metodo_pago === 'Pix' ? 'Pago Aprovado' : 'Pago Aprovado'; // Simulamos aprobación directa para pruebas
        
        const insertarPedidoQuery = `
            INSERT INTO pedidos (usuario_id, total, metodo_pago, cuotas, status_envio, estado_pago, cep, direccion, ciudad)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id;
        `;
        const resPedido = await client.query(insertarPedidoQuery, [
            usuarioId, total, metodo_pago, parseInt(cuotas || 1), 'Pendiente', estadoPagoInicial, cep.trim(), direccion.trim(), ciudad || ciudad.trim()
        ]);
        const nuevoPedidoId = resPedido.rows[0].id;

        // ========================================================
        // NUEVO: INSERTAR DETALLES EN LA TABLA HIJA pedido_elementos
        // ========================================================
        for (const item of items) {
            const idProd = item.producto_id || item.id;
            const cantidadComprada = item.cantidad || 1;
            const precioHistorico = item.precio || 0;

            const insertarElementoQuery = `
                INSERT INTO pedido_elementos (pedido_id, producto_id, cantidad, precio_historico)
                VALUES ($1, $2, $3, $4);
            `;
            await client.query(insertarElementoQuery, [nuevoPedidoId, idProd, cantidadComprada, precioHistorico]);
        }

        // 5. LIMPIEZA FÍSICA DEL CARRITO EN LA BASE DE DATOS
        const buscarCarritoQuery = "SELECT id FROM carritos WHERE usuario_id = \$1;";
        const resCarrito = await client.query(buscarCarritoQuery, [usuarioId]);
        if (resCarrito.rows.length > 0) {
            const carritoId = resCarrito.rows[0].id;
            await client.query("DELETE FROM carrito_elementos WHERE carrito_id = \$1;", [carritoId]);
        }

        // 6. PROCESAMIENTO DE LAS PASARELAS FINANCIERAS SIMULADAS
        if (metodo_pago === 'Pix') {
            await client.query(`
                INSERT INTO seguimiento_envios (pedido_id, estado_logistico, detalles)
                VALUES ($1, 'Separando estoque', 'Pagamento via PIX confirmado instantaneamente. O pedido foi encaminhado para separação de estoque.');
            `, [nuevoPedidoId]);

            await client.query("INSERT INTO metricas_tienda (tipo_evento, monto_venta) VALUES ('venda_concluida', \$1)", [total]);
            await client.query('COMMIT');

            return res.status(201).json({
                mensaje: "¡Pago por PIX procesado con éxito!",
                pedidoId: nuevoPedidoId,
                status: "Pago Aprovado",
                email: emailCliente,
                pix_copia_e_cola: "00020101021226870014br.gov.bcb.pix2565voke-ficticio-qr-code-key"
            });
        }

        if (metodo_pago === 'Credito' || metodo_pago === 'Debito') {
            const nTarjeta = detallesTarjeta?.numeroTarjeta || '';
            
            if (nTarjeta.endsWith('0000')) {
                await client.query("UPDATE pedidos SET estado_pago = 'Recusado' WHERE id = \$1", [nuevoPedidoId]);
                await client.query(`
                    INSERT INTO seguimiento_envios (pedido_id, estado_logistico, detalles)
                    VALUES ($1, 'Aguardando Pagamento', 'A transação do cartão foi recusada pela operadora devido a saldo insuficiente.');
                `, [nuevoPedidoId]);

                await client.query('COMMIT');
                return res.status(402).json({ error: "Transação recusada. Saldo insuficiente ou dados incorretos." });
            }

            const detallesLogistica = metodo_pago === 'Credito' 
                ? `Pagamento via Cartão de Crédito aprovado em ${cuotas} parcelas.`
                : 'Pagamento via Cartão de Débito à vista aprovado com sucesso.';

            await client.query(`
                INSERT INTO seguimiento_envios (pedido_id, estado_logistico, detalles)
                VALUES ($1, 'Separando estoque', $2);
            `, [nuevoPedidoId, detallesLogistica]);

            await client.query("INSERT INTO metricas_tienda (tipo_evento, monto_venta) VALUES ('venda_concluida', \$1)", [total]);
            await client.query('COMMIT');

            return res.status(201).json({
                mensaje: `¡Transacción de ${metodo_pago} aprobada con éxito!`,
                pedidoId: nuevoPedidoId,
                status: "Pago Aprovado",
                email: emailCliente,
                comprovante_id: `COMP-${Math.floor(100000 + Math.random() * 900000)}`
            });
        }

        throw new Error("Método de pagamento não suportado no sistema Voke.");

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error en la arquitectura de pagos:", error.message);
        res.status(500).json({ error: error.message || "Error interno del servidor." });
    } finally {
        client.release();
    }
};

module.exports = { procesarPagoSimulado };