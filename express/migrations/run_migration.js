const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const config = require('../config');

async function runMigration() {
  try {
    // 获取数据库配置
    const dbConfig = config.getDatabaseConfig();
    
    // 创建数据库连接
    const connection = await mysql.createConnection(dbConfig);
    
    console.log('数据库连接成功，开始执行迁移...');
    
    // 读取迁移SQL文件
    const migrationPath = path.join(__dirname, 'add_status_to_users.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // 分割SQL语句（按分号分割）
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    // 执行每个SQL语句
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('执行SQL:', statement.substring(0, 50) + '...');
        await connection.execute(statement);
      }
    }
    
    console.log('迁移执行成功！');
    
    // 关闭连接
    await connection.end();
    
  } catch (error) {
    console.error('迁移执行失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行迁移
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };