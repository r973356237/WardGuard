const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { initializeDB } = require('./db');

// 打印当前配置信息
config.printConfig();

// 初始化Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors(config.getCorsConfig()));
app.use(express.json());

// 生产环境下托管前端静态文件
if (config.isProduction()) {
  const buildPath = path.join(__dirname, '../client/build');
  app.use(express.static(buildPath));
  console.log('生产环境：托管前端静态文件');
} else {
  console.log('开发环境：前端由开发服务器托管');
}

// 导入路由
const userRoutes = require('./routes/userRoutes');
const supplyRoutes = require('./routes/supplyRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const medicalExaminationRoutes = require('./routes/medicalExaminationRoutes');
const operationRecordRoutes = require('./routes/operationRecordRoutes');
const systemRoutes = require('./routes/systemRoutes');

// 使用路由
app.use('/api/users', userRoutes);
app.use('/api/supplies', supplyRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/medical-examinations', medicalExaminationRoutes);
app.use('/api/operation-records', operationRecordRoutes);
app.use('/api', systemRoutes);

if (config.isDevelopment()) {
  console.log('所有API路由已挂载 (开发环境)');
} else {
  console.log('所有API路由已挂载 (生产环境)');
}

// 基础路由测试
app.get('/api', (req, res) => {
  res.json({ 
    success: true, 
    message: '科室管理系统后端API已启动',
    environment: config.isProduction() ? 'production' : 'development',
    version: '1.0.0'
  });
});

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// 生产环境下，将所有非API请求重定向到index.html，支持前端路由
if (config.isProduction()) {
  app.get('*', (req, res) => {
    const buildPath = path.join(__dirname, '../client/build');
    res.sendFile('index.html', { root: buildPath });
  });
}

// 初始化数据库连接并启动服务器
async function startServer() {
  try {
    await initializeDB();
    console.log('数据库连接初始化完成');
  } catch (error) {
    console.error('数据库连接初始化失败:', error);
    console.warn('继续启动服务器，但数据库功能将不可用');
  }
  
  // 无论数据库连接是否成功，都启动服务器
  app.listen(PORT, () => {
    console.log(`服务器已启动，运行在 http://localhost:${PORT}`);
  });
}

startServer();