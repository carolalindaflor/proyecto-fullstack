const express = require('express');
const router = express.Router();
const { obtenerProductos, obtenerProductoPorId, crearProducto, actualizarProducto, eliminarProducto } = require('../controllers/productoController');
const { autenticarToken, autorizarAdmin } = require('../middlewares/authMiddleware');

router.get('/', obtenerProductos);
router.get('/:id', obtenerProductoPorId);

// Rutas protegidas (Requieren token)
router.post('/', autenticarToken, autorizarAdmin, crearProducto);
router.put('/:id', autenticarToken, autorizarAdmin, actualizarProducto);
router.delete('/:id', autenticarToken, autorizarAdmin, eliminarProducto);

module.exports = router;