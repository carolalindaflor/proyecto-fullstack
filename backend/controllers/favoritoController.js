const pool = require('../config/db');

// GET: listar favoritos do cliente autenticado
const obtenerFavoritos = async (req, res) => {
    const usuarioId = req.usuario.id;

    try {
        const query = `
            SELECT
                f.id AS favorito_id,
                f.created_at,
                p.*,
                COALESCE(
                    json_agg(pi.url) FILTER (WHERE pi.url IS NOT NULL),
                    '[]'
                ) AS imagenes
            FROM favoritos f
            INNER JOIN productos p ON p.id = f.producto_id
            LEFT JOIN producto_imagenes pi ON pi.producto_id = p.id
            WHERE f.usuario_id = $1
            GROUP BY f.id, p.id
            ORDER BY f.created_at DESC;
        `;

        const resultado = await pool.query(query, [usuarioId]);

        res.json(resultado.rows);

    } catch (error) {
        console.error('Erro ao consultar favoritos:', error);
        res.status(500).json({
            error: 'Não foi possível consultar os favoritos.'
        });
    }
};

// POST: adicionar produto aos favoritos
const agregarFavorito = async (req, res) => {
    const usuarioId = req.usuario.id;
    const { productoId } = req.body;

    if (!Number.isInteger(Number(productoId)) || Number(productoId) <= 0) {
        return res.status(400).json({
            error: 'Informe um ID de produto válido.'
        });
    }

    try {
        const producto = await pool.query(
            'SELECT id FROM productos WHERE id = $1',
            [Number(productoId)]
        );

        if (producto.rows.length === 0) {
            return res.status(404).json({
                error: 'Produto não encontrado.'
            });
        }

        const resultado = await pool.query(`
            INSERT INTO favoritos (usuario_id, producto_id)
            VALUES ($1, $2)
            ON CONFLICT (usuario_id, producto_id) DO NOTHING
            RETURNING *;
        `, [usuarioId, Number(productoId)]);

        res.status(resultado.rowCount ? 201 : 200).json({
            mensaje: resultado.rowCount
                ? 'Produto adicionado aos favoritos.'
                : 'Este produto já está nos favoritos.',
            favorito: resultado.rows[0] || null
        });

    } catch (error) {
        console.error('Erro ao adicionar favorito:', error);
        res.status(500).json({
            error: 'Não foi possível adicionar o favorito.'
        });
    }
};

// DELETE: remover produto dos favoritos
const eliminarFavorito = async (req, res) => {
    const usuarioId = req.usuario.id;
    const { productoId } = req.params;

    if (!Number.isInteger(Number(productoId)) || Number(productoId) <= 0) {
        return res.status(400).json({
            error: 'Informe um ID de produto válido.'
        });
    }

    try {
        const resultado = await pool.query(`
            DELETE FROM favoritos
            WHERE usuario_id = $1
              AND producto_id = $2
            RETURNING id;
        `, [usuarioId, Number(productoId)]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                error: 'Favorito não encontrado.'
            });
        }

        res.json({
            mensaje: 'Produto removido dos favoritos.'
        });

    } catch (error) {
        console.error('Erro ao remover favorito:', error);
        res.status(500).json({
            error: 'Não foi possível remover o favorito.'
        });
    }
};

module.exports = {
    obtenerFavoritos,
    agregarFavorito,
    eliminarFavorito
};