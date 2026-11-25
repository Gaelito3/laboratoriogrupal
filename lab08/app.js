require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const tareaRoutes = require('./routes/tareaRoutes');
const pomodoroRoutes = require('./routes/pomodoroRoutes'); 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: process.env.SESSION_SECRET || 'secreto',
        resave: false,
        saveUninitialized: false,
        cookie: { httpOnly: true }
    })
);

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/tareas', tareaRoutes);
app.use('/api/pomodoros', pomodoroRoutes);
app.use('/api', userRoutes);

// AQUÍ ESTÁ EL CAMBIO: Ahora la raíz carga index.html en lugar de login.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});
