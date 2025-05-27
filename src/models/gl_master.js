const mongoose = require('mongoose');

const glMasterSchema = new mongoose.Schema({
  gl_code: {
    type: Number,
    required: true,
    unique: true
  },
  gl_account_long_name: {
    type: String,
  },
  gl_account_short_name: {
    type: String,
  },
  product_category: {
    type: String,
    default: null
  },
  sales_type: {
    type: String,
    default: null
  },
  need_type: {
    type: String,
    default: null
  },
  type: {
    type: String, // e.g., 'PL', 'BS'
  },
  sub1: {
    type: String,
  },
  l1: {
    type: Number,
  },
  sub2: {
    type: String,
  },
  l2: {
    type: Number,
  },
  sub_title: {
    type: String,
  },
  // 👇 添加这几行
  lvl1: { type: Number },
  lvl2: { type: Number },
  lvl3: { type: Number }
}, {
  collection: 'gl_master',
  timestamps: true
});

module.exports = mongoose.model('gl_master', glMasterSchema);
