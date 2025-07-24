const mysql = require('mysql2/promise');
const config = require('./config');

async function checkEmployeesTable() {
  let connection;
  
  try {
    console.log('连接数据库...');
    const dbConfig = config.getDatabaseConfig();
    connection = await mysql.createConnection(dbConfig);
    
    console.log('查看实际的employees表结构...');
    const [rows] = await connection.execute('DESCRIBE employees');
    console.log('employees表结构:');
    console.table(rows);
    
    console.log('\n查看employees表中的数据...');
    const [data] = await connection.execute('SELECT * FROM employees LIMIT 5');
    console.log('employees表数据示例:');
    console.table(data);
    
  } catch (error) {
    console.error('查看表结构失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkEmployeesTable();