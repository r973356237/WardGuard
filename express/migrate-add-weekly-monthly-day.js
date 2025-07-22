const { getPool } = require('./db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('开始执行添加 weekly_day 和 monthly_day 字段迁移...');
    
    const pool = await getPool();
    
    // 读取SQL文件
    const sqlFile = path.join(__dirname, 'migrations', 'add_weekly_monthly_day_fields.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('SQL文件内容长度:', sqlContent.length);
    
    // 更好的SQL语句分割逻辑
    const statements = sqlContent
      .split('\n')
      .filter(line => line.trim() && !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`找到 ${statements.length} 个SQL语句需要执行`);
    
    // 执行每个SQL语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`执行第 ${i + 1} 个SQL语句:`, statement.substring(0, 100) + '...');
        try {
          const result = await pool.query(statement);
          console.log(`✅ 第 ${i + 1} 个SQL语句执行成功`);
        } catch (error) {
          console.error(`❌ 第 ${i + 1} 个SQL语句执行失败:`, error.message);
          throw error;
        }
      }
    }
    
    // 验证字段是否添加成功
    console.log('验证字段是否添加成功...');
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'email_config' 
      AND COLUMN_NAME IN ('weekly_day', 'monthly_day')
    `);
    
    console.log('找到的字段:', columns);
    
    console.log('✅ weekly_day 和 monthly_day 字段添加完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error);
    process.exit(1);
  }
}

runMigration();