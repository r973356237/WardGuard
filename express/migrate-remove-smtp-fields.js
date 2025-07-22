const { getPool } = require('./db');
const fs = require('fs');
const path = require('path');
const util = require('util');

async function runMigration() {
  try {
    console.log('开始执行SMTP字段移除迁移...');
    
    const pool = await getPool();
    
    // 检查email_config表是否存在
    console.log('检查email_config表是否存在...');
    const [tableExists] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'email_config'
    `);
    
    if (tableExists[0].count === 0) {
      console.log('⚠️ email_config表不存在，无需修改');
      return;
    }
    
    console.log('✅ email_config表存在，继续执行迁移...');
    
    // 检查各个字段是否存在
    const checkColumnExists = async (columnName) => {
      const [result] = await pool.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'email_config' 
        AND COLUMN_NAME = ?
      `, [columnName]);
      return result[0].count > 0;
    };
    
    // 逐个检查并删除字段
    const smtpColumns = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password'];
    for (const column of smtpColumns) {
      const exists = await checkColumnExists(column);
      if (exists) {
        try {
          await pool.query(`ALTER TABLE email_config DROP COLUMN ${column}`);
          console.log(`✅ ${column}字段已删除`);
        } catch (error) {
          console.error(`❌ 删除${column}字段失败:`, error.message);
          throw error;
        }
      } else {
        console.log(`ℹ️ ${column}字段不存在，无需删除`);
      }
    }
    
    // 更新表注释
    try {
      await pool.query(`ALTER TABLE email_config COMMENT '邮件提醒配置表（不包含SMTP配置，SMTP配置已迁移至smtp_config表）'`);
      console.log('✅ 邮件配置表注释已更新');
    } catch (error) {
      console.error('❌ 更新表注释失败:', error.message);
      // 不抛出错误，继续执行
    }
    
    // 验证字段是否已删除
    console.log('验证字段是否已删除...');
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'email_config'
      AND COLUMN_NAME IN ('smtp_host', 'smtp_port', 'smtp_user', 'smtp_password')
    `);
    
    if (columns.length === 0) {
      console.log('✅ 所有SMTP相关字段已成功删除');
    } else {
      console.warn('⚠️ 以下SMTP字段仍然存在:', columns.map(col => col.COLUMN_NAME).join(', '));
    }
    
    console.log('✅ SMTP字段移除迁移完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }
}

runMigration();