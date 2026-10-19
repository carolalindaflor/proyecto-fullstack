const pool = require('./db');

// Función encargada de buscar y avanzar los paquetes en la base de datos
const simularAvanceLogistico = async () => {
    try {
        // 1. Buscamos el último estado de cada pedido registrado en la tabla seguimiento_envios
        const queryPedidosActivos = `
            SELECT DISTINCT ON (pedido_id) pedido_id, estado_logistico
            FROM seguimiento_envios
            ORDER BY pedido_id, fecha_actualizacion DESC;
        `;
        const result = await pool.query(queryPedidosActivos);
        
        if (result.rows.length === 0) return;

        // FASE A: Filtrar pedidos que están en preparación de almacén
        const paraRuta = result.rows.filter(row => row.estado_logistico === 'Separando estoque');

        // FASE B: Filtrar pedidos que ya están en camino y deben ser entregados
        const paraEntregar = result.rows.filter(row => row.estado_logistico === 'Em rota de entrega');

        // --- PROCESAR FASE A: De Almacén a Ruta ---
        if (paraRuta.length > 0) {
            console.log(`🤖 [Simulador Voke]: Procesando salida de almacén para ${paraRuta.length} pedido(s)...`);
            for (const ped of paraRuta) {
                const queryRuta = `
                    INSERT INTO seguimiento_envios (pedido_id, estado_logistico, detalles)
                    VALUES ($1, 'Em rota de entrega', 'O produto saiu do centro de distribuição da Voke e está em rota de entrega para o endereço cadastrado.');
                `;
                await pool.query(queryRuta, [ped.pedido_id]);
                console.log(`🚚 [Logística Voke]: ¡Pedido ID ${ped.pedido_id} avanzó a "Em rota de entrega"!`);
            }
        }

        // --- PROCESAR FASE B: De Ruta a Entregado ---
        if (paraEntregar.length > 0) {
            console.log(`🤖 [Simulador Voke]: Procesando entrega final para ${paraEntregar.length} pedido(s)...`);
            for (const ped of paraEntregar) {
                // 1. Inyectamos el estado definitivo en la línea de tiempo logística.
                const queryEntrega = `
                    INSERT INTO seguimiento_envios (pedido_id, estado_logistico, detalles)
                    VALUES ($1, 'Entregue', 'Pedido entregue com sucesso no endereço do destinatário. Obrigado por comprar na Voke Brasil!');
                `;
                await pool.query(queryEntrega, [ped.pedido_id]);

                // El envío y el pago son estados distintos: una entrega no altera el pago aprobado.
                await pool.query("UPDATE pedidos SET status_envio = 'Entregado' WHERE id = $1", [ped.pedido_id]);

                console.log(`🏠 [Logística Voke]: ¡Pedido ID ${ped.pedido_id} ha sido marcado como "Entregue"!`);
            }
        }

    } catch (error) {
        console.error("🔴 Error en el motor de simulación logística extendido:", error.message);
    }
};

// Función que arranca el reloj del temporizador (se mantiene cada 30 segundos)
const iniciarSimuladorLogistico = () => {
    console.log("🚀 [Sistema Voke]: Motor de simulación logística (Flujo Completo) encendido.");
    setInterval(simularAvanceLogistico, 30000);
};

module.exports = { iniciarSimuladorLogistico };