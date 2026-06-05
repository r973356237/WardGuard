const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { initializeDB, healthCheck } = require('./db');
const schedulerService = require('./services/schedulerService');
const appWarmup = require('./utils/appWarmup');
const { errorHandler, notFoundHandler } = require('./middleware/error_handler');

// 打印当前配置信息
config.printConfig();

// 初始化Express应用 - 重启服务器以应用调试增强
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors(config.getCorsConfig()));
app.use(express.json({ limit: '10mb' }));

// 健康检查端点（在数据库初始化之前就可用）
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await healthCheck();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: { status: 'unhealthy', message: error.message },
      uptime: process.uptime()
    });
  }
});

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
app.use('/api', permissionRoutes); // 权限管理路由

// 注意：systemRoutes 已在 /api/system 挂载，不再重复挂载以避免路由冲突

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

// 预热状态接口
app.get('/api/warmup-status', (req, res) => {
  const warmupStatus = appWarmup.getWarmupStatus();
  res.json({
    success: true,
    data: warmupStatus,
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

// 404 处理中间件（放在所有路由之后）
app.use(notFoundHandler);

// 全局错误处理中间件（使用统一的错误处理器）
app.use(errorHandler);

// 优化的服务器启动函数，确保数据库完全初始化后再启动HTTP服务
async function startServer() {
  try {
    console.log('🚀 正在启动科室管理系统服务器...');
    
    // 第一步：初始化数据库连接
    console.log('📊 步骤 1/4: 初始化数据库连接...');
    await initializeDB();
    console.log('✅ 数据库连接初始化完成');
    
    // 第二步：等待一段时间确保数据库完全稳定
    console.log('⏳ 步骤 2/4: 等待数据库稳定...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ 数据库连接稳定');
    
    // 第三步：初始化定时任务调度器
    console.log('⏰ 步骤 3/4: 初始化定时任务调度器...');
    await schedulerService.init();
    console.log('✅ 定时任务调度器初始化完成');
    
    // 第四步：启动HTTP服务器
    console.log('🌐 步骤 4/5: 启动HTTP服务器...');
    const server = app.listen(PORT, async () => {
      console.log('✅ 科室管理系统服务器启动成功!');
      console.log(`🔗 服务器地址: http://localhost:${PORT}`);
      console.log(`📊 健康检查: http://localhost:${PORT}/health`);
      console.log(`🎯 API端点: http://localhost:${PORT}/api`);
      console.log('📧 邮件提醒服务已启动');
      
      // 第五步：应用预热（异步执行，不阻塞服务器启动）
      console.log('🔥 步骤 5/5: 开始应用预热...');
      appWarmup.warmup().then(() => {
        console.log('🎉 系统已完全准备就绪，可以接受请求');
      }).catch(error => {
        console.warn('⚠️ 应用预热失败，但服务器仍可正常使用:', error.message);
        console.log('🎉 系统已准备就绪，可以接受请求');
      });
    });

    // 优雅关闭处理
    const gracefulShutdown = (signal) => {
      console.log(`\n📡 收到 ${signal} 信号，正在优雅关闭服务器...`);
      
      // 停止所有定时任务
      schedulerService.stopAllTasks();
      console.log('✅ 定时任务已停止');
      
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
    console.error('💡 请检查以下项目:');
    console.error('   1. MySQL服务是否正在运行');
    console.error('   2. 数据库配置是否正确');
    console.error('   3. 网络连接是否正常');
    console.error('   4. 端口是否被占用');
    process.exit(1);
  }
}

// 启动服务器
startServer().catch(error => {
  console.error('❌ 启动过程中发生未处理的错误:', error);
  process.exit(1);
});