const express = require('express');
const cors = require('cors');
const path = require('path');

// 环境检测和配置加载
const isProduction = process.env.NODE_ENV === 'production';
const isServer = process.platform === 'linux';

console.log(`🚀 启动环境: ${isProduction ? '生产环境' : '开发环境'}`);
console.log(`🖥️ 运行平台: ${process.platform}`);

// 根据环境和平台选择配置文件
let configFile = '.env.development';
if (isProduction || isServer) {
  configFile = '.env.production';
}

console.log(`📄 加载配置文件: ${configFile}`);

// 加载环境配置
require('dotenv').config({ path: configFile });

// 现在加载其他模块
const config = require('./config');

// 打印配置信息
config.printConfig();

// 初始化Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors(config.getCorsConfig()));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 添加请求日志中间件（仅在开发环境）
if (!isProduction) {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
  });
}

// 健康检查端点（最高优先级）
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    platform: process.platform,
    uptime: process.uptime(),
    memory: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB'
  });
});

// 简单的API测试端点
app.get('/api', (req, res) => {
  res.json({ 
    success: true, 
    message: '科室管理系统后端API已启动',
    environment: isProduction ? 'production' : 'development',
    platform: process.platform,
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 数据库状态检查端点
app.get('/api/db-status', async (req, res) => {
  try {
    const { healthCheck } = require('./db');
    const dbHealth = await healthCheck();
    res.json({
      success: true,
      database: dbHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: '数据库连接检查失败',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 生产环境下托管前端静态文件
if (isProduction) {
  const buildPath = path.join(__dirname, '../client/build');
  if (require('fs').existsSync(buildPath)) {
    app.use(express.static(buildPath));
    console.log('✅ 生产环境：托管前端静态文件');
  } else {
    console.log('⚠️ 前端构建文件不存在，跳过静态文件托管');
  }
} else {
  console.log('🔧 开发环境：前端由开发服务器托管');
}

// 延迟加载路由和数据库相关模块
async function loadRoutes() {
  try {
    console.log('📋 正在加载API路由...');
    
    // 导入路由
    const userRoutes = require('./routes/userRoutes');
    const supplyRoutes = require('./routes/supplyRoutes');
    const medicineRoutes = require('./routes/medicineRoutes');
    const employeeRoutes = require('./routes/employeeRoutes');
    const medicalExaminationRoutes = require('./routes/medicalExaminationRoutes');
    const operationRecordRoutes = require('./routes/operationRecordRoutes');
    const systemRoutes = require('./routes/systemRoutes');
    const dashboardRoutes = require('./routes/dashboardRoutes');
    const permissionRoutes = require('./routes/permissionRoutes');

    // 使用路由
    app.use('/api/users', userRoutes);
    app.use('/api/supplies', supplyRoutes);
    app.use('/api/medicines', medicineRoutes);
    app.use('/api/employees', employeeRoutes);
    app.use('/api/medical-examinations', medicalExaminationRoutes);
    app.use('/api/operation-records', operationRecordRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/system', systemRoutes);
    app.use('/api', permissionRoutes);
    app.use('/api', systemRoutes);

    console.log('✅ API路由加载完成');
    return true;
  } catch (error) {
    console.error('❌ 路由加载失败:', error.message);
    return false;
  }
}

// 生产环境下的前端路由处理
if (isProduction) {
  app.get('*', (req, res) => {
    const buildPath = path.join(__dirname, '../client/build');
    const indexPath = path.join(buildPath, 'index.html');
    
    if (require('fs').existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({
        success: false,
        message: '前端文件不存在',
        path: indexPath
      });
    }
  });
}

// 全局错误处理中间件
app.use((error, req, res, next) => {
  console.error('❌ 全局错误处理:', error);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: isProduction ? '服务器错误' : error.message,
    timestamp: new Date().toISOString()
  });
});

// 渐进式启动函数
async function startServer() {
  try {
    console.log('🚀 正在启动科室管理系统服务器...');
    console.log(`📍 工作目录: ${process.cwd()}`);
    
    // 第一步：启动基础HTTP服务器
    console.log('🌐 步骤 1/4: 启动基础HTTP服务器...');
    const server = app.listen(PORT, () => {
      console.log('✅ 基础HTTP服务器启动成功');
      console.log(`🔗 服务器地址: http://localhost:${PORT}`);
      console.log(`📊 健康检查: http://localhost:${PORT}/health`);
    });

    // 第二步：加载路由
    console.log('📋 步骤 2/4: 加载API路由...');
    const routesLoaded = await loadRoutes();
    if (routesLoaded) {
      console.log('✅ API路由加载完成');
    } else {
      console.log('⚠️ API路由加载失败，但服务器继续运行');
    }

    // 第三步：初始化数据库连接（非阻塞）
    console.log('📊 步骤 3/4: 初始化数据库连接...');
    try {
      const { initializeDB } = require('./db');
      await initializeDB();
      console.log('✅ 数据库连接初始化完成');
    } catch (dbError) {
      console.warn('⚠️ 数据库连接初始化失败，但服务器继续运行:', dbError.message);
      console.log('💡 数据库相关功能可能不可用');
    }

    // 第四步：初始化定时任务调度器（非阻塞）
    console.log('⏰ 步骤 4/4: 初始化定时任务调度器...');
    try {
      const schedulerService = require('./services/schedulerService');
      await schedulerService.init();
      console.log('✅ 定时任务调度器初始化完成');
    } catch (schedulerError) {
      console.warn('⚠️ 定时任务调度器初始化失败，但服务器继续运行:', schedulerError.message);
      console.log('💡 邮件提醒功能可能不可用');
    }

    console.log('\n🎉 服务器启动完成！');
    console.log('📝 可用端点:');
    console.log(`   - 健康检查: http://localhost:${PORT}/health`);
    console.log(`   - API状态: http://localhost:${PORT}/api`);
    console.log(`   - 数据库状态: http://localhost:${PORT}/api/db-status`);

    // 优雅关闭处理
    const gracefulShutdown = (signal) => {
      console.log(`\n📡 收到 ${signal} 信号，正在优雅关闭服务器...`);
      
      server.close(() => {
        console.log('✅ HTTP服务器已关闭');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    console.error('💡 请尝试以下解决方案:');
    console.error('   1. 运行诊断脚本: node server-diagnostics.js');
    console.error('   2. 检查端口是否被占用');
    console.error('   3. 检查文件权限');
    console.error('   4. 查看详细错误日志');
    process.exit(1);
  }
}

// 启动服务器
startServer().catch(error => {
  console.error('❌ 启动过程中发生未处理的错误:', error);
  console.error('💡 建议运行诊断脚本: node server-diagnostics.js');
  process.exit(1);
});