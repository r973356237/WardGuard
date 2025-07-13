require('dotenv').config();
const mysql = require('mysql2/promise');

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

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
      console.log('Database connected successfully');
      resolve(dbPool);
    } catch (error) {
      console.error('Database connection failed:', error.message);
      reject(error);
      process.exit(1); // 连接失败时终止进程
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