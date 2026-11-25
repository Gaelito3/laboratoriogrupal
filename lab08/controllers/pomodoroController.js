const db = require('../db');

exports.registrarPomodoro = async (req, res) => {
    try {
        const { duracion } = req.body;
        if (!duracion) return res.status(400).json({ message: 'La duración es obligatoria' });

        const result = await db.query(
            'INSERT INTO pomodoros (usuario_id, duracion_minutos) VALUES ($1, $2) RETURNING *',
            [req.session.userId, duracion]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al guardar pomodoro' });
    }
};
