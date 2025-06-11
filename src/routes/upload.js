// routes/upload.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const BudgetInput = require('../models/budget_input');
const CostCenter = require('../models/user'); // cost_centers 存在于 user model 中

router.post('/upload-budgets', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const rows = req.body.data;

    if (!Array.isArray(rows) || rows.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Invalid or empty data' });
    }

    const userIds = [...new Set(rows.map(row => row.userid))];
    const costCenters = await CostCenter.find({ cost_center_name: { $in: userIds } });
    const userCurrencyMap = {};
    costCenters.forEach(u => {
      userCurrencyMap[u.cost_center_name] = u.currency || 'N/A';
    });

    const errors = [];
    const bulkOps = [];

    for (const row of rows) {
      const { userid, glcode, glyear, glmonth, value } = row;

      if (!userid || !glcode || !glyear || isNaN(parseInt(glmonth))) {
        errors.push(`Invalid data in row: ${JSON.stringify(row)}`);
        continue;
      }

      const currency = userCurrencyMap[userid];
      if (!currency || currency === 'N/A') {
        errors.push(`Currency not found for userid: ${userid}`);
        continue;
      }

      const monthMap = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const monthName = monthMap[parseInt(glmonth) - 1];
      if (!monthName) {
        errors.push(`Invalid month in row: ${JSON.stringify(row)}`);
        continue;
      }

      const updateQuery = {
        updateOne: {
          filter: { userid, gl_code: glcode, glyear },
          update: { $set: { currency, [`values.${monthName}`]: parseFloat(value) || 0 } },
          upsert: true
        }
      };

      bulkOps.push(updateQuery);
    }

    if (errors.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Upload contains errors', errors });
    }

    if (bulkOps.length > 0) {
      await BudgetInput.bulkWrite(bulkOps, { session });
    }

    await session.commitTransaction();
    session.endSession();

    res.json({ message: `✅ Uploaded ${bulkOps.length} budget records successfully.` });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ Upload error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
