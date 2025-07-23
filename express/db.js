const mysql = require('mysql2/promise');
const config = require('./config');

// 获取数据库连接配置
const dbConfig = {
  ...config.getDatabaseConfig(),
  connectionLimit: 20, // 连接池大小
  idleTimeout: 300000, // 空闲连接超时时间（5分钟）
  maxIdle: 10, // 最大空闲连接数
  enableKeepAlive: true, // 启用保持连接
  keepAliveInitialDelay: 0
};

// 创建数据库连接池
let dbPool;
let initializing = false;
let initializationPromise = null;

// 数据库连接重试函数
const connectWithRetry = async (maxRetries = 5, delay = 2000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // 如果连接池存在，先尝试关闭
      if (dbPool) {
        try {
          await dbPool.end();
          console.log('已关闭旧的数据库连接池');
        } catch (err) {
          console.warn('关闭旧连接池时出错:', err.message);
        }
        dbPool = null;
      }

      // 创建新的连接池
      console.log('正在创建新的数据库连接池...');
      dbPool = mysql.createPool({
        ...dbConfig,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        connectTimeout: 10000,
        acquireTimeout: 10000
      });
      
      // 测试连接
      const connection = await dbPool.getConnection();
      await connection.ping();
      
      // 设置连接错误处理
      connection.on('error', async (err) => {
        console.error('数据库连接错误:', err.message);
        if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
          console.log('检测到连接丢失，准备重新连接...');
          try {
            await connectWithRetry(3, 1000);
          } catch (reconnectError) {
            console.error('重连失败:', reconnectError.message);
          }
        }
      });
      
      connection.release();
      
      if (config.isDevelopment()) {
        console.log(`✅ 数据库连接成功 (开发环境) (尝试 ${i + 1}/${maxRetries})`);
      } else {
        console.log(`✅ 数据库连接成功 (生产环境) (尝试 ${i + 1}/${maxRetries})`);
      }
      return dbPool;
    } catch (error) {
      console.warn(`⚠️ 数据库连接失败 (尝试 ${i + 1}/${maxRetries}):`, error.message);
      
      if (i === maxRetries - 1) {
        console.error('❌ 数据库连接重试次数已用完，连接失败');
        throw error;
      }
      
      // 等待后重试
      console.log(`⏳ ${delay}ms 后重试连接...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // 指数退避：每次重试延迟时间翻倍
      delay *= 2;
    }
  }
};

// 数据库健康检查
const healthCheck = async () => {
  try {
    if (!dbPool) {
      throw new Error('数据库连接池未初始化');
    }
    
    const connection = await dbPool.getConnection();
    await connection.ping();
    connection.release();
    
    return { status: 'healthy', message: '数据库连接正常' };
  } catch (error) {
    console.error('数据库健康检查失败:', error);
    return { status: 'unhealthy', message: error.message };
  }
};

async function initializeDB() {
  // 如果已经初始化，直接返回
  if (dbPool) {
    return dbPool;
  }
  
  // 如果正在初始化，等待初始化完成
  if (initializing) {
    return initializationPromise;
  }
  
  // 开始初始化
  initializing = true;
  initializationPromise = new Promise(async (resolve, reject) => {
    try {
      console.log('🔄 正在初始化数据库连接...');
      await connectWithRetry();
      
      // 定期健康检查（每30秒）
      setInterval(async () => {
        const health = await healthCheck();
        if (health.status === 'unhealthy') {
          console.warn('⚠️ 数据库健康检查失败，尝试重新连接...');
          try {
            await connectWithRetry(3, 1000);
          } catch (error) {
            console.error('❌ 数据库重连失败:', error);
          }
        }
      }, 30000);
      
      console.log('✅ 数据库初始化完成');
      resolve(dbPool);
    } catch (error) {
      console.error('数据库连接失败:', error.message);
      
      if (config.isDevelopment()) {
        console.error('详细错误信息:', error.stack);
      }
      
      console.warn('继续运行，但数据库功能将不可用');
      resolve(null); // 不终止进程，继续运行
    } finally {
      initializing = false;
      initializationPromise = null;
    }
  });
  
  return initializationPromise;
}

// 执行查询的包装函数，包含重试机制
const executeQuery = async (sql, params = [], maxRetries = 3) => {
  let lastError = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // 确保数据库已初始化
      if (!dbPool) {
        console.log('数据库连接池未初始化，正在初始化...');
        await initializeDB();
      }

      // 获取连接并执行查询
      const connection = await dbPool.getConnection();
      try {
        // 先ping测试连接是否有效
        await connection.ping();
        const [results] = await connection.execute(sql, params);
        return results;
      } catch (queryError) {
        lastError = queryError;
        console.error(`查询执行出错 (尝试 ${i + 1}/${maxRetries}):`, {
          error: queryError.message,
          code: queryError.code,
          sql: queryError.sql,
          sqlState: queryError.sqlState,
          sqlMessage: queryError.sqlMessage
        });
        throw queryError;
      } finally {
        connection.release();
      }
    } catch (error) {
      lastError = error;
      console.warn(`查询执行失败 (尝试 ${i + 1}/${maxRetries}):`, {
        message: error.message,
        code: error.code,
        sql: error.sql,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });
      
      // 如果是最后一次重试，抛出详细错误
      if (i === maxRetries - 1) {
        const detailedError = new Error(`查询执行失败 (已重试${maxRetries}次): ${error.message}`);
        detailedError.originalError = error;
        detailedError.sql = sql;
        detailedError.params = params;
        throw detailedError;
      }
      
      // 如果是连接相关错误，尝试重新连接
      if ([
        'PROTOCOL_CONNECTION_LOST',
        'ECONNRESET',
        'ENOTFOUND',
        'EPIPE',
        'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR'
      ].includes(error.code)) {
        console.log('检测到连接错误，尝试重新建立连接...');
        try {
          await connectWithRetry(2, 1000);
        } catch (reconnectError) {
          console.error('重连失败:', reconnectError.message);
        }
      }
      
      // 使用递增的延迟时间
      const delay = 1000 * Math.pow(2, i);
      console.log(`等待 ${delay}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // 如果所有重试都失败了，抛出最后一个错误
  throw lastError;
};

// 优雅关闭数据库连接
const closeDB = async () => {
  try {
    if (dbPool) {
      await dbPool.end();
      console.log('✅ 数据库连接池已关闭');
    }
  } catch (error) {
    console.error('❌ 关闭数据库连接池失败:', error);
  }
};

// 监听进程退出事件，优雅关闭数据库连接
process.on('SIGINT', async () => {
  console.log('\n🔄 正在优雅关闭数据库连接...');
  await closeDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 正在优雅关闭数据库连接...');
  await closeDB();
  process.exit(0);
});

module.exports = {
  getPool: async () => {
    if (!dbPool) {
      await initializeDB();
    }
    return dbPool;
  },
  initializeDB,
  executeQuery,
  healthCheck,
  closeDB
};