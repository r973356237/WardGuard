const mysql = require('mysql2/promise');
const config = require('./config');

async function addStatusFieldToEmployees() {
  let connection;
  
  try {
    console.log('连接数据库...');
    const dbConfig = config.getDatabaseConfig();
    connection = await mysql.createConnection(dbConfig);
    
    console.log('检查employees表是否已有status字段...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'status'
    `, [dbConfig.database]);
    
    if (columns.length > 0) {
      console.log('status字段已存在，无需添加');
      return;
    }
    
    console.log('添加status字段到employees表...');
    await connection.execute(`
      ALTER TABLE employees 
      ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT '在职' 
      COMMENT '员工状态：在职、离职、调岗等'
    `);
    
    console.log('status字段添加成功！');
    
    // 验证字段是否添加成功
    console.log('验证employees表结构...');
    const [rows] = await connection.execute('DESCRIBE employees');
    
    console.log('更新后的employees表字段列表:');
    rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.Field} - ${row.Type} - ${row.Null} - ${row.Key} - ${row.Default}`);
    });
    
  } catch (error) {
    console.error('添加status字段失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addStatusFieldToEmployees();