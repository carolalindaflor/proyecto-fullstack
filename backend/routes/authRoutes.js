const express = require('express');
const router = express.Router();
const { rateLimit } = require('express-rate-limit');
//const { registrarUsuario, loginUsuario, modificarDatosBasicos, modificarContrasena,eliminarUsuario } = require('../controllers/authController');
const { registrarUsuario, loginUsuario, modificarDatosBasicos, modificarContrasena, eliminarUsuario, obtenerUsuarioPorId } = require('../controllers/authController');
const { autenticarToken, autorizarPropietario } = require('../middlewares/authMiddleware');

const limitarRegistro = rateLimit({
	windowMs: 60 * 60 * 1000,
	limit: 10,
	standardHeaders: 'draft-8',
	legacyHeaders: false,
	message: { error: 'Demasiados registros desde esta conexión. Intenta más tarde.' }
});

const limitarLogin = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 10,
	standardHeaders: 'draft-8',
	legacyHeaders: false,
	message: { error: 'Demasiados intentos de acceso. Intenta de nuevo en 15 minutos.' }
});

//const { registrarUsuario, loginUsuario } = require('../controllers/authController');

// Ruta para registrar un nuevo usuario y su perfil
router.post('/register', limitarRegistro, registrarUsuario);

// Ruta para iniciar sesión y obtener el token JWT
router.post('/login', limitarLogin, loginUsuario);

//CORRECCIÓN: Rutas CRUD que te hacían falta para modificar (PUT)
router.put('/usuario/:id', autenticarToken, autorizarPropietario, modificarDatosBasicos);
router.put('/usuario/password/:id', autenticarToken, autorizarPropietario, modificarContrasena);

// 🚀 ENDPOINT AUTOMÁTICO: Conectado de forma nativa a tu controlador central de PostgreSQL
router.get('/usuario/:id', autenticarToken, autorizarPropietario, obtenerUsuarioPorId);

// CORRECCIÓN: Endpoint faltante del CRUD para eliminar cuenta (DELETE)
router.delete('/usuario/:id', autenticarToken, autorizarPropietario, eliminarUsuario);


module.exports = router;