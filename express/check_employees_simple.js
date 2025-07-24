const mysql = require('mysql2/promise');
const config = require('./config');

async function checkEmployeesTableSimple() {
  let connection;
  
  try {
    console.log('连接数据库...');
    const dbConfig = config.getDatabaseConfig();
    connection = await mysql.createConnection(dbConfig);
    
    console.log('查看实际的employees表结构...');
    const [rows] = await connection.execute('DESCRIBE employees');
    
    console.log('employees表字段列表:');
    rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.Field} - ${row.Type} - ${row.Null} - ${row.Key} - ${row.Default}`);
    });
    
    console.log('\n查看employees表记录数量...');
    const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM employees');
    console.log('employees表记录数量:', countResult[0].count);
    
  } catch (error) {
    console.error('查看表结构失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkEmployeesTableSimple();