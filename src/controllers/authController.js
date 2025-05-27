const User = require('../models/user');

const login = async (req, res) => {
  try {
    const { cost_center_name, password } = req.decryptedData;

    console.log("Login request body: ", req.body);

    const user = await User.findOne({ cost_center_name });
    if (!user) {
      return res.status(402).json({ message: 'Invalid cost_center_name' });
    }

    const isMatch = await user.checkPassword(password);
    if (!isMatch) {
      return res.status(403).json({ message: 'Invalid password' });
    }

    const token = user.generateAuthToken();

    res.json({
      token,
      user: {
        companyid: user.companyid,
        company_name: user.company_name,
        abbrev: user.abbrev,
        currency: user.currency,
        companyid2: user.companyid2,
        profit_center: user.profit_center,
        region: user.region,
        branch: user.branch,
        cost_center_id: user.cost_center_id,
        cost_center: user.cost_center,
        cost_center_name: user.cost_center_name
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const logout = async (req, res) => {
  console.log("Logout request body: ", req.body);
  try {
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const me = async (req, res) => {
  try {
    const user = await User.findOne({ cost_center_id: req.user.cost_center_id });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      user: {
        companyid: user.companyid,
        company_name: user.company_name,
        abbrev: user.abbrev,
        currency: user.currency,
        companyid2: user.companyid2,
        profit_center: user.profit_center,
        region: user.region,
        branch: user.branch,
        cost_center_id: user.cost_center_id,
        cost_center: user.cost_center,
        cost_center_name: user.cost_center_name
      },
    });
  } catch (err) {
    console.error('Error in /auth/me:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  login,
  logout,
  me
};
