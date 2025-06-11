const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/auth');  // 注意路径
const glRoutes = require('./routes/gl');      // 注意路径
const reportRoutes = require('./routes/report')
const uploadRoutes = require('./routes/upload'); // ✅ 新增这一行


const app = express();

// 增加请求体大小限制为 50MB (根据实际情况调整)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


app.use(express.json());

const corsOptions = {
  origin: ['http://localhost:3000', 'https://ebudget-frontend.onrender.com'], // 允许的前端地址（React 默认端口）
  credentials: true,
};
app.use(cors(corsOptions));


app.use(helmet());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/gl', glRoutes);
app.use('/api/report', reportRoutes); // ✅ 注册路由前缀
app.use('/api/upload', uploadRoutes); // ✅ 注册新的 upload 路由前缀


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
