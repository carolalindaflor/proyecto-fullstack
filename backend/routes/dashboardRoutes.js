const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { 
    obtenerMetricasGenerales, 
    listarCategoriasAdmin,
    crearCategoriaAdmin,
    eliminarCategoriaAdmin 
} = require('../controllers/dashboardController');
const { autenticarToken, autorizarAdmin } = require('../middlewares/authMiddleware');

// --- 1. ENDPOINTS DE ANALÍTICA E INVENTARIO COLECTIVO ---
router.get('/analitica', autenticarToken, autorizarAdmin, obtenerMetricasGenerales);
router.get('/categorias', autenticarToken, autorizarAdmin, listarCategoriasAdmin);
router.post('/categorias', autenticarToken, autorizarAdmin, crearCategoriaAdmin);
router.delete('/categorias/:id', autenticarToken, autorizarAdmin, eliminarCategoriaAdmin);

// --- 2. ENDPOINTS ADICIONALES: CONTROL DE PERSONAL Y ROLES (NUEVO) ---
// Obtener la lista completa de todas las cuentas registradas en PostgreSQL
router.get('/usuarios', autenticarToken, autorizarAdmin, async (req, res) => {
    try {
        const query = `
            SELECT u.id, u.email, u.perfil, u.fecha_registro, cp.nome_completo 
            FROM usuarios u
            LEFT JOIN clientes_perfil cp ON cp.usuario_id = u.id
            ORDER BY u.id ASC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error("Error al listar usuarios en admin:", error);
        res.status(500).json({ error: "Error interno en el servidor al recuperar usuarios." });
    }
});

// Cambiar o alternar el rol entre 'cliente' y 'admin'
router.put('/usuarios/rol/:id', autenticarToken, autorizarAdmin, async (req, res) => {
    const { id } = req.params;
    const { nuevoPerfil } = req.body; // Se espera 'cliente' o 'admin'

    if (!['cliente', 'admin'].includes(nuevoPerfil)) {
        return res.status(400).json({ error: "Perfil o rol no válido en el sistema Voke." });
    }

    // Regla de seguridad crítica: Bloquear la degradación accidental de la cuenta raíz
    if (parseInt(id) === 999 && nuevoPerfil === 'cliente') {
        return res.status(400).json({ error: "Seguridad: No puede remover los permisos del Administrador Maestro Semilla." });
    }

    try {
        const query = "UPDATE usuarios SET perfil = \$1 WHERE id = \$2 RETURNING id, perfil;";
        const result = await pool.query(query, [nuevoPerfil, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "El usuario especificado no existe." });
        }

        res.json({ mensaje: "Rol de usuario actualizado con éxito en PostgreSQL." });
    } catch (error) {
        console.error("Error al actualizar rol:", error);
        res.status(500).json({ error: "Error interno en el servidor al modificar permisos." });
    }
});

module.exports = router;