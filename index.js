const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { initializeDB } = require('./db');
const systemRoutes = require('./routes/systemRoutes');

// 初始化Express应用
const app = express();
const PORT = 3000;

// 中间件配置
app.use(cors());
app.use(express.json());

// 导入路由
const userRoutes = require('./routes/userRoutes');
const supplyRoutes = require('./routes/supplyRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const medicalExaminationRoutes = require('./routes/medicalExaminationRoutes');
const operationRecordRoutes = require('./routes/operationRecordRoutes');

// 使用路由
app.use('/api/users', userRoutes);
console.log('用户路由已挂载');
app.use('/api/supplies', supplyRoutes);
console.log('物资路由已挂载');
app.use('/api/medicines', medicineRoutes);
console.log('药品路由已挂载');
app.use('/api/employees', employeeRoutes);
console.log('人员路由已挂载');
app.use('/api/medical-examinations', medicalExaminationRoutes);
console.log('体检信息路由已挂载');
app.use('/api/operation-records', operationRecordRoutes);
console.log('操作记录路由已挂载');
app.use('/api', systemRoutes);
console.log('系统名称路由已挂载');

// 基础路由测试
app.get('/api', (req, res) => {
  console.log('收到基础API请求');
  res.json({ success: true, message: '科室管理系统后端API已启动' });
});

// 初始化数据库连接并启动服务器
async function startServer() {
  try {
    await initializeDB();
    console.log('数据库连接初始化完成');
    app.listen(PORT, () => {
      console.log(`服务器已启动，运行在 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

startServer();