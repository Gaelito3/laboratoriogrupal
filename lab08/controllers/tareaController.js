const db = require('../db');

// 1. Obtener todas las tareas
exports.getTareas = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM tareas WHERE usuario_id = $1 ORDER BY id DESC',
            [req.session.userId]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener tareas' });
    }
};

// 2. Crear una nueva tarea
exports.createTarea = async (req, res) => {
    try {
        const { titulo, descripcion } = req.body;
        if (!titulo) return res.status(400).json({ message: 'El título es obligatorio' });

        const result = await db.query(
            'INSERT INTO tareas (usuario_id, titulo, descripcion) VALUES ($1, $2, $3) RETURNING *',
            [req.session.userId, titulo, descripcion || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear tarea' });
    }
};

// 3. Actualizar tarea (Aquí guardamos la fecha exacta de completado)
exports.updateTarea = async (req, res) => {
    try {
        const { id } = req.params;
        const { completada } = req.body;
        
        const query = completada 
            ? 'UPDATE tareas SET completada = $1, completado_en = CURRENT_TIMESTAMP WHERE id = $2 AND usuario_id = $3 RETURNING *'
            : 'UPDATE tareas SET completada = $1, completado_en = NULL WHERE id = $2 AND usuario_id = $3 RETURNING *';

        const result = await db.query(query, [completada, id, req.session.userId]);
        
        if (result.rows.length === 0) return res.status(404).json({ message: 'Tarea no encontrada' });
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar tarea' });
    }
};

// 4. Eliminar tarea
exports.deleteTarea = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'DELETE FROM tareas WHERE id = $1 AND usuario_id = $2 RETURNING *',
            [id, req.session.userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Tarea no encontrada' });
        res.status(200).json({ message: 'Tarea eliminada' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar tarea' });
    }
};

// 5. Obtener estadísticas para el Dashboard
exports.getEstadisticas = async (req, res) => {
    try {
        const totalRes = await db.query('SELECT COUNT(*) FROM tareas WHERE usuario_id = $1', [req.session.userId]);
        const completadasRes = await db.query('SELECT COUNT(*) FROM tareas WHERE usuario_id = $1 AND completada = true', [req.session.userId]);
        
        const porDiaRes = await db.query(`
            SELECT TO_CHAR(completado_en, 'DD/MM/YYYY') as dia, COUNT(*) as cantidad 
            FROM tareas 
            WHERE usuario_id = $1 AND completada = true AND completado_en IS NOT NULL
            GROUP BY dia 
            ORDER BY MIN(completado_en) ASC 
            LIMIT 7
        `, [req.session.userId]);

        res.status(200).json({
            total: parseInt(totalRes.rows[0].count),
            completadas: parseInt(completadasRes.rows[0].count),
            porDia: porDiaRes.rows
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};
