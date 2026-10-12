const express = require('express');
const router = express.Router();
const { obtenerCategorias, obtenerCategoriaPorId, crearCategoria, actualizarCategoria, eliminarCategoria } = require('../controllers/categoriaController');
const { autenticarToken, autorizarAdmin } = require('../middlewares/authMiddleware');

router.get('/', obtenerCategorias);
router.get('/:id', obtenerCategoriaPorId);

// Rutas protegidas (Requieren token)
router.post('/', autenticarToken, autorizarAdmin, crearCategoria);
router.put('/:id', autenticarToken, autorizarAdmin, actualizarCategoria);
router.delete('/:id', autenticarToken, autorizarAdmin, eliminarCategoria);

module.exports = router;