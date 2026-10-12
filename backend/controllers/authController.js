const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// const pool = new Pool({
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     host: process.env.DB_HOST,
//     port: process.env.DB_PORT,
//     database: process.env.DB_NAME
// });

const pool = require('../config/db'); // Importación limpia y unificada

// 1. REGISTRO DE USUARIO (Encripta la clave e impacta ambas tablas)
const registrarUsuario = async (req, res) => {
    const { 
        email, contrasena, cpf_cnpj, nome_completo, 
        fecha_nacimiento, sexo, telefono, cep, direccion, ciudad
    } = req.body;

    // Validación básica de campos obligatorios
    if (!email || !contrasena || !cpf_cnpj || !nome_completo) {
        return res.status(400).json({ error: "Faltan campos obligatorios (email, contraseña, CPF/CNPJ o nombre)" });
    }

    // Iniciamos una transacción en Postgres para asegurar que se guarden ambas tablas o ninguna
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Encriptar la contraseña (salto de 10 rondas por seguridad)
        const salt = await bcrypt.genSalt(10);
        const contrasenaEncriptada = await bcrypt.hash(contrasena, salt);

        // Insertar en la tabla 'usuarios'
        const queryUsuario = `
            INSERT INTO usuarios (email, contrasena, perfil) 
            VALUES ($1, $2, $3) 
            RETURNING id, email, perfil;
        `;
        const tipoPerfil = 'cliente';
        const resUsuario = await client.query(queryUsuario, [email, contrasenaEncriptada, tipoPerfil]);
        const usuarioId = resUsuario.rows[0].id;

        // Insertar en la tabla 'clientes_perfil' usando el usuarioId recién generado
        const queryPerfil = `
            INSERT INTO clientes_perfil (usuario_id, cpf_cnpj, nome_completo, fecha_nacimiento, sexo, telefono, cep, direccion, ciudad)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
        `;
        await client.query(queryPerfil, [
            usuarioId, cpf_cnpj, nome_completo, fecha_nacimiento || null, 
            sexo || 'O', telefono || null, cep || null, direccion || null, ciudad || null
        ]);

        // Confirmamos la transacción
        await client.query('COMMIT');

        res.status(201).json({
            mensaje: "¡Usuario registrado con éxito!",
            usuario: resUsuario.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK'); // Si algo falla, cancelamos todo el proceso
        console.error("Error en registro:", error);
        if (error.code === '23505') { // Código de error de Postgres para llaves duplicadas (email o CPF único)
            return res.status(400).json({ error: "El correo electrónico o CPF/CNPJ ya se encuentra registrado." });
        }
        res.status(500).json({ error: "Error interno del servidor al registrar." });
    } finally {
        client.release();
    }
};

// 2. LOGIN DE USUARIO (Verifica credenciales y genera JWT)
const loginUsuario = async (req, res) => {
    const { email, contrasena } = req.body;

    if (!email || !contrasena) {
        return res.status(400).json({ error: "Por favor suministre email y contraseña" });
    }

    try {
        // Buscar si el usuario existe
        const query = 'SELECT * FROM usuarios WHERE email = \$1';
        const result = await pool.query(query, [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Credenciales inválidas (Correo no encontrado)" });
        }

        const usuario = result.rows[0];

        // Comparar la contraseña ingresada con la contraseña encriptada en la BD
        const contraseñaCorrecta = await bcrypt.compare(contrasena, usuario.contrasena);
        if (!contraseñaCorrecta) {
            return res.status(401).json({ error: "Credenciales inválidas (Contraseña incorrecta)" });
        }

        // Generar el token JWT incluyendo el id y el perfil del usuario
        const token = jwt.sign(
            { id: usuario.id, perfil: usuario.perfil },
            process.env.JWT_SECRET,
            { expiresIn: '24h' } // El token expira en 24 horas
        );

        res.json({
            mensaje: "¡Autenticación exitosa!",
            token,
            usuario: { id: usuario.id, email: usuario.email, perfil: usuario.perfil }
        });

    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ error: "Error interno del servidor al iniciar sesión." });
    }
};
// 3. MODIFICAR DATOS BÁSICOS DEL PERFIL (PUT)
const modificarDatosBasicos = async (req, res) => {
    const { id } = req.params;
    const { nome_completo, telefono } = req.body;

    try {
        const query = `
            UPDATE clientes_perfil 
            SET nome_completo = $1, telefono = $2 
            WHERE usuario_id = $3
            RETURNING *;
        `;
        const result = await pool.query(query, [nome_completo, telefono, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Perfil de usuario no encontrado." });
        }

        res.json({
            mensaje: "¡Datos actualizados con éxito!",
            usuario: { id, nome_completo, telefono }
        });
    } catch (error) {
        console.error("Error al modificar datos:", error);
        res.status(500).json({ error: "Error interno del servidor al actualizar datos." });
    }
};

// 4. MODIFICAR EXCLUSIVAMENTE LA CLAVE (PUT CON VALIDACIÓN)
const modificarContrasena = async (req, res) => {
    const { id } = req.params;
    const { contrasenaAnterior, nuevaContrasena } = req.body;

    try {
        // Buscar la contraseña actual encriptada
        const userQuery = 'SELECT * FROM usuarios WHERE id = \$1';
        const userResult = await pool.query(userQuery, [id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado." });
        }

        const usuario = userResult.rows[0];

        // Validar contraseña anterior
        const contraseñaCorrecta = await bcrypt.compare(contrasenaAnterior, usuario.contrasena);
        if (!contraseñaCorrecta) {
            return res.status(401).json({ error: "A senha anterior está incorreta." });
        }

        // Encriptar la nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const nuevaEncriptada = await bcrypt.hash(nuevaContrasena, salt);

        // Actualizar en la tabla
        await pool.query('UPDATE usuarios SET contrasena = \$1 WHERE id = \$2', [nuevaEncriptada, id]);

        res.json({ mensaje: "¡Contraseña actualizada con éxito!" });
    } catch (error) {
        console.error("Error al modificar contraseña:", error);
        res.status(500).json({ error: "Error interno del servidor al actualizar contraseña." });
    }
};
// 5. ELIMINAR CUENTA DE USUARIO PERMANENTEMENTE (DELETE)
const eliminarUsuario = async (req, res) => {
    const { id } = req.params;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Eliminamos primero el perfil extendido usando $1
        const deletePerfilQuery = 'DELETE FROM clientes_perfil WHERE usuario_id = $1;';
        await client.query(deletePerfilQuery, [id]);

        // 2. Eliminamos las credenciales principales usando $1 (Corregido el escape)
        const deleteUsuarioQuery = 'DELETE FROM usuarios WHERE id = $1 RETURNING id;';
        const resUsuario = await client.query(deleteUsuarioQuery, [id]);

        if (resUsuario.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "O usuário não foi encontrado no sistema." });
        }

        await client.query('COMMIT');
        res.json({ mensaje: "¡Cuenta de usuario y perfil eliminados con éxito!" });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error al eliminar usuario en el backend:", error);
        res.status(500).json({ error: "Erro interno do servidor ao deletar usuário." });
    } finally {
        client.release();
    }
};
// 🕵️‍♂️ FUNCIÓN CONTROLADORA: Consulta el perfil del cliente directo en PostgreSQL
// 🕵️‍♂️ FUNCIÓN CONTROLADORA CALIBRADA CON TU TABLA RELACIONAL REAL
const obtenerUsuarioPorId = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Consulta relacional exacta apuntando a tu tabla clientes_perfil y tu columna usuario_id
    const query = `
        SELECT usuario_id AS id, nome_completo, telefono 
        FROM clientes_perfil 
        WHERE usuario_id = $1;
    `;
    const resultado = await pool.query(query, [id]);
    
    if (resultado.rows.length === 0) {
      // Si el perfil está vacío en la base de datos local, devolvemos un objeto base para no romper el frontend
      return res.json({ usuario: { id, nome_completo: '', telefono: '' } });
    }
    
    // Devolvemos el registro mapeado de forma limpia para que el frontend lo procese
    res.json({ usuario: resultado.rows[0] });
  } catch (error) {
    console.error("Error al obtener usuario en el backend controlador:", error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar dados do cliente.' });
  }
};

// Asegúrate de agregar obtenerUsuarioPorId dentro del module.exports al final del archivo:
module.exports = {
  registrarUsuario,
  loginUsuario,
  modificarDatosBasicos,
  modificarContrasena,
  eliminarUsuario,
  obtenerUsuarioPorId // <-- Añádelo aquí
};

// const eliminarUsuario = async (req, res) => {
//     const { id } = req.params;

//     // Conectamos un cliente de la pool para procesar la transacción de forma aislada
//     const client = await pool.connect();
//     try {
//         await client.query('BEGIN');

//         // 1. Eliminamos primero el perfil extendido en 'clientes_perfil' por las llaves foráneas
//         const deletePerfilQuery = 'DELETE FROM clientes_perfil WHERE usuario_id = $1;';
//         await client.query(deletePerfilQuery, [id]);

//         // 2. Eliminamos las credenciales principales en la tabla 'usuarios'
//         const deleteUsuarioQuery = 'DELETE FROM usuarios WHERE id = $1 RETURNING id;';
//         const resUsuario = await client.query(deleteUsuarioQuery, [id]);

//         // Si la consulta no devuelve filas, significa que el ID enviado no existía
//         if (resUsuario.rows.length === 0) {
//             await client.query('ROLLBACK');
//             return res.status(404).json({ error: "O usuário não foi encontrado no sistema." });
//         }

//         // Confirmamos de manera definitiva la remoción en la base de datos
//         await client.query('COMMIT');

//         res.json({ 
//             mensaje: "¡Cuenta de usuario y perfil eliminados con éxito del sistema!" 
//         });

//     } catch (error) {
//         // Si ocurre cualquier falla de red o de base de datos, abortamos el borrado
//         await client.query('ROLLBACK');
//         console.error("Error al eliminar usuario en el backend:", error);
//         res.status(500).json({ error: "Erro interno do servidor ao deletar usuário do banco de dados." });
//     } finally {
//         client.release();
//     }
// };

//module.exports = {registrarUsuario,loginUsuario,modificarDatosBasicos,modificarContrasena,eliminarUsuario};

//module.exports = { registrarUsuario, loginUsuario };