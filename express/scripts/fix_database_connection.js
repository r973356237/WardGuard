const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function checkDatabaseConnection() {
  try {
    console.log('开始检查数据库连接...');
    console.log('数据库配置信息:');
    console.log(`主机: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`用户: ${process.env.DB_USER || 'root'}`);
    console.log(`数据库: ${process.env.DB_NAME || 'wardguard'}`);
    
    // 创建数据库连接池
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'wardguard',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000 // 增加连接超时时间
    });
    
    // 测试连接
    console.log('尝试连接数据库...');
    const connection = await pool.getConnection();
    console.log('数据库连接成功!');
    
    // 测试查询
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('查询测试成功:', rows);
    
    // 释放连接
    connection.release();
    
    // 关闭连接池
    await pool.end();
    
    console.log('数据库连接检查完成，一切正常');
    return true;
  } catch (error) {
    console.error('数据库连接错误:', error);
    console.log('\n请检查以下可能的问题:');
    console.log('1. 数据库服务是否已启动');
    console.log('2. 数据库主机地址是否正确');
    console.log('3. 数据库用户名和密码是否正确');
    console.log('4. 数据库名称是否存在');
    console.log('5. 防火墙是否阻止了连接');
    console.log('6. 数据库服务器是否允许远程连接');
    return false;
  }
}

// 执行检查
checkDatabaseConnection();