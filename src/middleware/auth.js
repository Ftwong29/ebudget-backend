const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    // 支持 Authorization: Bearer <token> 格式
    const authHeader = req.headers.authorization || req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or malformed token' });
    }

    const token = authHeader.split(' ')[1]; // 提取 Bearer 后面的 token

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // 验证 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    console.log('✅ Authenticated user:', decoded);
    next();
  } catch (error) {
    console.error('❌ JWT Error:', error.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = auth;
