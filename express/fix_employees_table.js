const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const config = require('./config');

async function fixEmployeesTable() {
  let connection;
  
  try {
    console.log('连接数据库...');
    const dbConfig = config.getDatabaseConfig();
    connection = await mysql.createConnection(dbConfig);
    
    console.log('读取员工表迁移脚本...');
    const migrationPath = path.join(__dirname, '../migrate_employees_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('执行员工表结构迁移...');
    // 分割SQL语句并逐个执行
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`执行: ${statement.substring(0, 50)}...`);
        await connection.execute(statement);
      }
    }
    
    console.log('员工表结构迁移完成！');
    
    // 验证迁移后的表结构
    console.log('验证迁移后的员工表结构...');
    const [rows] = await connection.execute('DESCRIBE employees');
    console.log('employees表结构:');
    console.table(rows);
    
  } catch (error) {
    console.error('员工表迁移失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixEmployeesTable();