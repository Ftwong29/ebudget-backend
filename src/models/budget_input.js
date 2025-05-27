const mongoose = require('mongoose');

const monthlyValueSchema = new mongoose.Schema({
  Jan: { type: Number, default: 0 },
  Feb: { type: Number, default: 0 },
  Mar: { type: Number, default: 0 },
  Apr: { type: Number, default: 0 },
  May: { type: Number, default: 0 },
  Jun: { type: Number, default: 0 },
  Jul: { type: Number, default: 0 },
  Aug: { type: Number, default: 0 },
  Sep: { type: Number, default: 0 },
  Oct: { type: Number, default: 0 },
  Nov: { type: Number, default: 0 },
  Dec: { type: Number, default: 0 },
}, { _id: false });

const budgetInputSchema = new mongoose.Schema({
  userid: { type: String, required: true },
  branch: { type: String, required: true },
  gl_code: { type: String, required: true },
  glyear: { type: Number, required: true },
  currency: { type: String, required: true },
  values: { type: monthlyValueSchema, required: true },
}, {
  timestamps: true
});

budgetInputSchema.index({ userid: 1, branch: 1, gl_code: 1, glyear: 1 }, { unique: true });

module.exports = mongoose.model('budget_inputs', budgetInputSchema);
