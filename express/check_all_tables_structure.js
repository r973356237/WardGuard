const mysql = require('mysql2/promise');
const config = require('./config');

async function checkAllTablesStructure() {
  let connection;
  
  try {
    console.log('连接数据库...');
    const dbConfig = config.getDatabaseConfig();
    connection = await mysql.createConnection(dbConfig);
    
    // 检查所有相关表的结构
    const tables = ['employees', 'medicines', 'supplies', 'medical_examinations'];
    
    for (const tableName of tables) {
      console.log(`\n=== ${tableName} 表结构 ===`);
      try {
        const [rows] = await connection.execute(`DESCRIBE ${tableName}`);
        rows.forEach((row, index) => {
          console.log(`${index + 1}. ${row.Field} - ${row.Type} - ${row.Null} - ${row.Key} - ${row.Default}`);
        });
      } catch (error) {
        console.log(`表 ${tableName} 不存在或查询失败: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('检查表结构失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAllTablesStructure();