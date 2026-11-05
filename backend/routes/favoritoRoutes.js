const express = require('express');
const router = express.Router();

const {
    obtenerFavoritos,
    agregarFavorito,
    eliminarFavorito
} = require('../controllers/favoritoController');

const { autenticarToken } = require('../middlewares/authMiddleware');

// Listar favoritos do cliente
router.get('/', autenticarToken, obtenerFavoritos);

// Adicionar um produto aos favoritos
router.post('/', autenticarToken, agregarFavorito);

// Remover um produto dos favoritos
router.delete('/:productoId', autenticarToken, eliminarFavorito);

module.exports = router;