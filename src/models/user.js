const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  companyid: {
    type: Number,
    required: true
  },
  company_name: {
    type: String,
    required: true
  },
  abbrev: {
    type: String,
    required: true
  },
  currency: {
    type: String,
    required: true
  },
  companyid2: {
    type: Number,
    required: true
  },
  profit_center: {
    type: String,
    required: true
  },
  region: {
    type: String,
    required: true
  },
  branch: {
    type: String,
    required: true
  },
  cost_center_id: {
    type: Number,
    required: true,
    unique: true
  },
  cost_center: {
    type: String,
    required: true
  },
  cost_center_name: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  email: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// 明文密码比对，带trim
userSchema.methods.checkPassword = function (inputPassword) {
  return this.password.trim() === inputPassword.trim();
};

// 生成 auth token
userSchema.methods.generateAuthToken = function() {
  const token = jwt.sign(
    { 
      companyid: this.companyid,
      company_name: this.company_name,
      abbrev: this.abbrev,
      currency: this.currency,
      companyid2: this.companyid2,
      profit_center: this.profit_center,
      region: this.region,
      branch: this.branch, 
      cost_center_id: this.cost_center_id,
      cost_center: this.cost_center,
      cost_center_name: this.cost_center_name
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  return token;
};

const User = mongoose.model('cost_centers', userSchema);

module.exports = User;
