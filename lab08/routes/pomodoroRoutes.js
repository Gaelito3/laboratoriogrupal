const express = require('express');
const router = express.Router();
const pomodoroController = require('../controllers/pomodoroController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware.requireAuth);
router.post('/', pomodoroController.registrarPomodoro);

module.exports = router;
