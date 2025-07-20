const mysql = require('mysql2/promise');
const config = require('./config');

// 获取数据库连接配置
const dbConfig = config.getDatabaseConfig();

// 创建数据库连接池
let dbPool;
let initializing = false;
let initializationPromise = null;

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
      dbPool = await mysql.createPool(dbConfig);
      // 测试连接
      const connection = await dbPool.getConnection();
      connection.release();
      
      if (config.isDevelopment()) {
        console.log('数据库连接成功 (开发环境)');
      } else {
        console.log('数据库连接成功 (生产环境)');
      }
      
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

module.exports = {
  getPool: async () => {
    if (!dbPool) {
      await initializeDB();
    }
    return dbPool;
  },
  initializeDB
};