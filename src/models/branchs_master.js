const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  branchid: String,
  currency: String,
  branchcode: String,
  branchcode2: String,
  description: String,
  locationid: Number,
  location: String
});

// 👇 指定 collection name 避免自动复数化错误
module.exports = mongoose.model('Branch', branchSchema, 'branchs_master');
