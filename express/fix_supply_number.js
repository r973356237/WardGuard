const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const config = require('./config');

async function fixSupplyNumberType() {
  let connection;
  
  try {
    console.log('连接数据库...');
    const dbConfig = config.getDatabaseConfig();
    connection = await mysql.createConnection(dbConfig);
    
    console.log('读取修正脚本...');
    const fixPath = path.join(__dirname, '../fix_supply_number_type.sql');
    console.log('脚本路径:', fixPath);
    const fixSQL = fs.readFileSync(fixPath, 'utf8');
    console.log('读取的SQL内容:', fixSQL);
    console.log('SQL内容长度:', fixSQL.length);
    
    console.log('执行字段类型修正...');
    // 分割SQL语句并逐个执行
    const statements = fixSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.match(/^\s*$/));
    
    console.log('找到的SQL语句数量:', statements.length);
    console.log('SQL语句:', statements);
    
    // 如果没有找到语句，直接执行整个SQL
    if (statements.length === 0) {
      const cleanSQL = fixSQL.replace(/--.*$/gm, '').trim();
      if (cleanSQL) {
        console.log('直接执行整个SQL:', cleanSQL);
        await connection.execute(cleanSQL);
        console.log('执行成功');
      }
    } else {
      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`执行: ${statement}`);
          await connection.execute(statement);
          console.log('执行成功');
        }
      }
    }
    
    console.log('字段类型修正完成！');
    
    // 验证修正后的表结构
    console.log('验证修正后的表结构...');
    const [rows] = await connection.execute('DESCRIBE supplies');
    console.log('supplies表结构:');
    console.table(rows);
    
  } catch (error) {
    console.error('修正失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixSupplyNumberType();