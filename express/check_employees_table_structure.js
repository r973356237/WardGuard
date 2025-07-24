const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: '117.72.123.17',
  user: 'fanjk-ward',
  password: 'xiaokai123',
  database: 'ward',
  port: 3306
};

async function checkEmployeesTableStructure() {
  let connection;
  
  try {
    console.log('连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');
    
    // 查询员工表结构
    console.log('\n--- 查询员工表结构 ---');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees'
      ORDER BY ORDINAL_POSITION
    `, ['ward']);
    
    console.log('员工表字段列表:');
    columns.forEach((col, index) => {
      console.log(`${index + 1}. ${col.COLUMN_NAME} (${col.DATA_TYPE}) - ${col.IS_NULLABLE === 'YES' ? '可空' : '非空'} ${col.COLUMN_COMMENT ? '- ' + col.COLUMN_COMMENT : ''}`);
    });
    
    // 检查是否有status字段
    const statusField = columns.find(col => col.COLUMN_NAME === 'status');
    console.log(`\n状态字段检查: ${statusField ? '✅ 存在' : '❌ 不存在'}`);
    
    if (statusField) {
      console.log(`状态字段详情: ${statusField.COLUMN_NAME} (${statusField.DATA_TYPE}) - ${statusField.IS_NULLABLE === 'YES' ? '可空' : '非空'}`);
    }
    
    // 查询一些示例数据
    console.log('\n--- 查询示例数据 ---');
    const [rows] = await connection.execute('SELECT * FROM employees LIMIT 3');
    console.log('示例数据字段:', Object.keys(rows[0] || {}));
    
  } catch (error) {
    console.error('查询过程中发生错误:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

checkEmployeesTableStructure();