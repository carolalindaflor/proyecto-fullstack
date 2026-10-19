const express = require('express');
const router = express.Router();
const { procesarPagoSimulado } = require('../controllers/pagoController');
const { autenticarToken } = require('../middlewares/authMiddleware');

// Adaptamos el endpoint para que reciba la pasarela con token de seguridad
router.post('/finalizar', autenticarToken, procesarPagoSimulado);

module.exports = router;