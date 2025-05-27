const CryptoJS = require('crypto-js');

const decryptMiddleware = (req, res, next) => {
  try {
    const encrypted = req.body.data;
    if (!encrypted) return res.status(400).json({ message: 'Missing encrypted data.' });

    const bytes = CryptoJS.AES.decrypt(encrypted, process.env.SECRET_KEY);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedText) return res.status(400).json({ message: 'Invalid encryption' });

    req.decryptedData = JSON.parse(decryptedText); // 可供后续 handler 使用
    next();
  } catch (error) {
    console.error('❌ Decryption error:', error);
    return res.status(400).json({ message: 'Decryption failed' });
  }
};

module.exports = decryptMiddleware;
