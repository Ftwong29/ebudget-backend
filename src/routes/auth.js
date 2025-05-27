const express = require('express');
const router = express.Router();
const { login, logout, me } = require('../controllers/authController');
const auth = require('../middleware/auth');
const decrypt = require('../middleware/decrypt'); // 可选，用于前端加密登录请求

router.post('/login', decrypt, login);
router.post('/logout', auth, logout);
router.get('/me', auth, me);

module.exports = router;
