const path = require('path');
const fs = require('fs');

/**
 * 环境配置管理模块
 * 根据NODE_ENV自动加载对应的环境配置文件
 */
class ConfigManager {
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
    this.loadConfig();
  }

  /**
   * 加载环境配置
   */
  loadConfig() {
    // 清除之前的dotenv配置
    delete require.cache[require.resolve('dotenv')];
    
    // 根据环境加载对应的配置文件
    const envFile = `.env.${this.env}`;
    const envPath = path.resolve(__dirname, envFile);
    
    // 检查环境特定的配置文件是否存在
    if (fs.existsSync(envPath)) {
      console.log(`加载环境配置: ${envFile}`);
      require('dotenv').config({ path: envPath });
    } else {
      console.log(`环境配置文件 ${envFile} 不存在，使用默认 .env 文件`);
      require('dotenv').config();
    }
    
    // 设置默认值
    this.setDefaults();
  }

  /**
   * 设置默认配置值
   */
  setDefaults() {
    // 服务器配置
    process.env.PORT = process.env.PORT || '3000';
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';
    
    // JWT配置
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
    
    // 日志级别
    process.env.LOG_LEVEL = process.env.LOG_LEVEL || (this.isProduction() ? 'error' : 'debug');
    
    // CORS配置
    process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || (this.isProduction() ? 'https://yourdomain.com' : '*');
  }

  /**
   * 判断是否为生产环境
   */
  isProduction() {
    return this.env === 'production';
  }

  /**
   * 判断是否为开发环境
   */
  isDevelopment() {
    return this.env === 'development';
  }

  /**
   * 获取数据库配置
   */
  getDatabaseConfig() {
    return {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT) || 3306,
      waitForConnections: true,
      connectionLimit: this.isProduction() ? 20 : 10,
      queueLimit: 0,
      acquireTimeout: 60000,
      timeout: 60000
    };
  }

  /**
   * 获取CORS配置
   */
  getCorsConfig() {
    const origin = process.env.CORS_ORIGIN;
    
    if (origin === '*') {
      return {
        origin: true,
        credentials: true
      };
    }
    
    return {
      origin: origin.split(',').map(url => url.trim()),
      credentials: true
    };
  }

  /**
   * 获取日志配置
   */
  getLogConfig() {
    return {
      level: process.env.LOG_LEVEL,
      enableConsole: this.isDevelopment(),
      enableFile: this.isProduction()
    };
  }

  /**
   * 获取JWT密钥
   */
  getJWTSecret() {
    return process.env.JWT_SECRET;
  }

  /**
   * 打印当前配置信息（隐藏敏感信息）
   */
  printConfig() {
    console.log('=== 当前环境配置 ===');
    console.log(`环境: ${this.env}`);
    console.log(`端口: ${process.env.PORT}`);
    console.log(`数据库主机: ${process.env.DB_HOST}`);
    console.log(`数据库名称: ${process.env.DB_NAME}`);
    console.log(`日志级别: ${process.env.LOG_LEVEL}`);
    console.log(`CORS源: ${process.env.CORS_ORIGIN}`);
    console.log('==================');
  }
}

// 创建单例实例
const configManager = new ConfigManager();

module.exports = configManager;