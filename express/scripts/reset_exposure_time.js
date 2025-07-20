const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

// 创建数据库连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wardguard',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function resetTotalExposureTime() {
  try {
    console.log('开始将total_exposure_time字段值全部修改为0...');
    
    // 执行更新操作
    const [result] = await pool.execute('UPDATE employees SET total_exposure_time = 0');
    
    console.log(`成功更新 ${result.affectedRows} 条记录，将total_exposure_time字段值全部修改为0`);
    
    // 关闭连接池
    await pool.end();
    
    console.log('操作完成');
  } catch (error) {
    console.error('更新数据时出错:', error);
    process.exit(1);
  }
}

// 执行重置操作
resetTotalExposureTime();