const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const auth = require('../middleware/auth');

router.get('/pnl', auth, reportController.getPNLReport); // ✅ PNL Detail 报告
router.get('/pnl-summary', auth, reportController.getPNLSummaryReport); // ✅ PNL Summary 报告

module.exports = router;
