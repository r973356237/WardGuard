const { getPool } = require('../db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  let pool;
  
  try {
    console.log('开始执行SMTP配置表迁移...');
    
    // 获取数据库连接池
    pool = await getPool();
    if (!pool) {
      throw new Error('无法获取数据库连接池');
    }
    console.log('数据库连接成功');
    
    // 读取SQL文件
    const sqlFile = path.join(__dirname, 'create_smtp_config_table.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // 分割SQL语句（按分号分割）
    const sqlStatements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`准备执行 ${sqlStatements.length} 条SQL语句`);
    
    // 逐条执行SQL语句
    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i];
      console.log(`执行第 ${i + 1} 条语句...`);
      
      try {
        await pool.execute(statement);
        console.log(`✓ 第 ${i + 1} 条语句执行成功`);
      } catch (error) {
        if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log(`⚠ 第 ${i + 1} 条语句跳过（字段不存在）: ${error.message}`);
        } else if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`⚠ 第 ${i + 1} 条语句跳过（字段已存在）: ${error.message}`);
        } else {
          console.error(`✗ 第 ${i + 1} 条语句执行失败:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('SMTP配置表迁移完成！');
    
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行迁移
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };