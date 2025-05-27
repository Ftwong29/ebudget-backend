const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const auth = require('../middleware/auth');

router.get('/pnl', auth, reportController.getPNLReport); // ✅ GET 而不是 POST

module.exports = router;
