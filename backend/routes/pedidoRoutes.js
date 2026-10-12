const express = require('express');
const router = express.Router();
const { rateLimit } = require('express-rate-limit');
const { procesarCheckout, consultarRastreo } = require('../controllers/pedidoController');
const { autenticarToken } = require('../middlewares/authMiddleware');

const limitarRastreo = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 30,
	standardHeaders: 'draft-8',
	legacyHeaders: false,
	message: { error: 'Demasiadas consultas de rastreo. Intenta más tarde.' }
});

// Ruta privada: Transforma el carrito en orden de compra
router.post('/checkout', autenticarToken, procesarCheckout);

// Ruta pública: Rastrea el paquete usando el código VK-XXXXXXXX
router.get('/rastreio/:codigo', limitarRastreo, consultarRastreo);

module.exports = router;