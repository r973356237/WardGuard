const { getPool } = require('../db');

/**
 * 数据库诊断工具
 */
class DatabaseDiagnostic {
  
  /**
   * 检查数据库连接
   */
  static async checkConnection() {
    try {
      console.log('=== 数据库连接诊断 ===');
      const pool = await getPool();
      console.log('✓ 数据库连接池获取成功');
      
      // 测试简单查询
      const [result] = await pool.query('SELECT 1 as test');
      console.log('✓ 数据库查询测试成功:', result);
      
      return { success: true, message: '数据库连接正常' };
    } catch (error) {
      console.error('✗ 数据库连接失败:', error);
      return { 
        success: false, 
        message: '数据库连接失败', 
        error: error.message,
        code: error.code 
      };
    }
  }

  /**
   * 检查邮件相关表结构
   */
  static async checkEmailTables() {
    try {
      console.log('=== 邮件表结构诊断 ===');
      const pool = await getPool();
      
      // 检查 email_config 表
      console.log('检查 email_config 表...');
      const [emailConfigTables] = await pool.query(`
        SELECT TABLE_NAME, TABLE_COMMENT 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'email_config'
      `);
      
      if (emailConfigTables.length === 0) {
        console.error('✗ email_config 表不存在');
        return { 
          success: false, 
          message: 'email_config 表不存在，请运行数据库迁移' 
        };
      }
      
      console.log('✓ email_config 表存在');
      
      // 检查 email_config 表字段
      const [emailConfigColumns] = await pool.query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'email_config'
        ORDER BY ORDINAL_POSITION
      `);
      
      console.log('email_config 表字段:');
      emailConfigColumns.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? '可空' : '非空'}) - ${col.COLUMN_COMMENT}`);
      });
      
      // 检查 smtp_config 表
      console.log('检查 smtp_config 表...');
      const [smtpConfigTables] = await pool.query(`
        SELECT TABLE_NAME, TABLE_COMMENT 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'smtp_config'
      `);
      
      if (smtpConfigTables.length === 0) {
        console.warn('⚠ smtp_config 表不存在');
      } else {
        console.log('✓ smtp_config 表存在');
        
        // 检查 smtp_config 表字段
        const [smtpConfigColumns] = await pool.query(`
          SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
          FROM information_schema.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'smtp_config'
          ORDER BY ORDINAL_POSITION
        `);
        
        console.log('smtp_config 表字段:');
        smtpConfigColumns.forEach(col => {
          console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? '可空' : '非空'}) - ${col.COLUMN_COMMENT}`);
        });
      }
      
      // 检查 email_logs 表
      console.log('检查 email_logs 表...');
      const [emailLogsTables] = await pool.query(`
        SELECT TABLE_NAME, TABLE_COMMENT 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'email_logs'
      `);
      
      if (emailLogsTables.length === 0) {
        console.warn('⚠ email_logs 表不存在');
      } else {
        console.log('✓ email_logs 表存在');
      }
      
      // 定义一个变量来存储 smtp_config 表的列信息
      let smtpColumns = [];
      if (smtpConfigTables.length > 0 && typeof smtpConfigColumns !== 'undefined') {
        smtpColumns = smtpConfigColumns;
      }

      return { 
        success: true, 
        message: '邮件表结构检查完成',
        tables: {
          email_config: emailConfigTables.length > 0,
          smtp_config: smtpConfigTables.length > 0,
          email_logs: emailLogsTables.length > 0
        },
        columns: {
          email_config: emailConfigColumns,
          smtp_config: smtpColumns
        }
      };
      
    } catch (error) {
      console.error('✗ 邮件表结构检查失败:', error);
      return { 
        success: false, 
        message: '邮件表结构检查失败', 
        error: error.message,
        code: error.code 
      };
    }
  }

  /**
   * 检查现有邮件配置
   */
  static async checkEmailConfig() {
    try {
      console.log('=== 邮件配置数据诊断 ===');
      const pool = await getPool();
      
      // 检查email_config表
      const [emailConfigs] = await pool.query('SELECT id, recipient_email, reminder_frequency, reminder_time, created_at, updated_at FROM email_config ORDER BY id DESC');
      
      // 检查smtp_config表
      const [smtpConfigs] = await pool.query('SELECT id, smtp_host, smtp_port, smtp_user, is_active, created_at, updated_at FROM smtp_config WHERE is_active = TRUE ORDER BY id DESC');
      
      if (emailConfigs.length === 0 && smtpConfigs.length === 0) {
        console.log('✓ 数据库中暂无邮件配置');
        return { success: true, message: '暂无邮件配置', emailConfigs: [], smtpConfigs: [] };
      }
      
      if (emailConfigs.length > 0) {
        console.log(`✓ 找到 ${emailConfigs.length} 条邮件提醒配置:`);
        emailConfigs.forEach((config, index) => {
          console.log(`  邮件提醒配置 ${index + 1}:`);
          console.log(`    - ID: ${config.id}`);
          console.log(`    - 收件人: ${config.recipient_email}`);
          console.log(`    - 提醒频率: ${config.reminder_frequency}`);
          console.log(`    - 提醒时间: ${config.reminder_time}`);
          console.log(`    - 创建时间: ${config.created_at}`);
          console.log(`    - 更新时间: ${config.updated_at}`);
        });
      }
      
      if (smtpConfigs.length > 0) {
        console.log(`✓ 找到 ${smtpConfigs.length} 条SMTP配置:`);
        smtpConfigs.forEach((config, index) => {
          console.log(`  SMTP配置 ${index + 1}:`);
          console.log(`    - ID: ${config.id}`);
          console.log(`    - SMTP主机: ${config.smtp_host}`);
          console.log(`    - SMTP端口: ${config.smtp_port}`);
          console.log(`    - SMTP用户: ${config.smtp_user}`);
          console.log(`    - 是否启用: ${config.is_active ? '是' : '否'}`);
          console.log(`    - 创建时间: ${config.created_at}`);
          console.log(`    - 更新时间: ${config.updated_at}`);
        });
      }
      
      return { 
        success: true, 
        message: '邮件配置检查完成', 
        configs: {
          email: emailConfigs,
          smtp: smtpConfigs
        }
      };
      
    } catch (error) {
      console.error('✗ 邮件配置检查失败:', error);
      return { 
        success: false, 
        message: '邮件配置检查失败', 
        error: error.message,
        code: error.code 
      };
    }
  }

  /**
   * 完整诊断
   */
  static async fullDiagnostic() {
    console.log('=== 开始完整数据库诊断 ===');
    
    const results = {
      connection: await this.checkConnection(),
      tables: await this.checkEmailTables(),
      config: await this.checkEmailConfig()
    };
    
    console.log('=== 诊断完成 ===');
    return results;
  }
}

module.exports = DatabaseDiagnostic;