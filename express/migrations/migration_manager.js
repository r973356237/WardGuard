const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// 正确加载环境变量文件
const envPath = path.join(__dirname, '..', '.env.development');
require('dotenv').config({ path: envPath });

/**
 * 数据库迁移管理器
 * 提供统一的数据库迁移功能，支持版本控制和回滚
 */
class MigrationManager {
  constructor() {
    this.connection = null;
    this.dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ward',
      charset: 'utf8mb4'
    };
  }

  /**
   * 连接数据库
   */
  async connect() {
    try {
      this.connection = await mysql.createConnection(this.dbConfig);
      console.log('✅ 数据库连接成功');
      
      // 创建迁移记录表
      await this.createMigrationTable();
    } catch (error) {
      console.error('❌ 数据库连接失败:', error.message);
      throw error;
    }
  }

  /**
   * 创建迁移记录表
   */
  async createMigrationTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_migration_name (migration_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据库迁移记录表'
    `;
    
    await this.connection.execute(createTableSQL);
    console.log('✅ 迁移记录表已准备就绪');
  }

  /**
   * 检查迁移是否已执行
   */
  async isMigrationExecuted(migrationName) {
    const [rows] = await this.connection.execute(
      'SELECT COUNT(*) as count FROM migrations WHERE migration_name = ?',
      [migrationName]
    );
    return rows[0].count > 0;
  }

  /**
   * 记录迁移执行
   */
  async recordMigration(migrationName) {
    await this.connection.execute(
      'INSERT INTO migrations (migration_name) VALUES (?)',
      [migrationName]
    );
    console.log(`✅ 迁移记录已保存: ${migrationName}`);
  }

  /**
   * 执行SQL文件
   */
  async executeSQLFile(filePath) {
    try {
      const sqlContent = await fs.readFile(filePath, 'utf8');
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      for (const statement of statements) {
        if (statement.trim()) {
          await this.connection.execute(statement);
        }
      }
      
      console.log(`✅ SQL文件执行成功: ${path.basename(filePath)}`);
    } catch (error) {
      console.error(`❌ SQL文件执行失败: ${path.basename(filePath)}`, error.message);
      throw error;
    }
  }

  /**
   * 检查字段是否存在
   */
  async columnExists(tableName, columnName) {
    try {
      const [rows] = await this.connection.execute(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
      `, [this.dbConfig.database, tableName, columnName]);
      
      return rows[0].count > 0;
    } catch (error) {
      console.error(`❌ 检查字段失败: ${tableName}.${columnName}`, error.message);
      return false;
    }
  }

  /**
   * 运行迁移
   */
  async runMigration(migrationName, sqlFilePath) {
    try {
      // 检查是否已执行
      if (await this.isMigrationExecuted(migrationName)) {
        console.log(`⏭️  迁移已执行，跳过: ${migrationName}`);
        return;
      }

      console.log(`🚀 开始执行迁移: ${migrationName}`);
      
      // 执行SQL文件
      await this.executeSQLFile(sqlFilePath);
      
      // 记录迁移
      await this.recordMigration(migrationName);
      
      console.log(`✅ 迁移执行完成: ${migrationName}`);
    } catch (error) {
      console.error(`❌ 迁移执行失败: ${migrationName}`, error.message);
      throw error;
    }
  }

  /**
   * 关闭连接
   */
  async close() {
    if (this.connection) {
      await this.connection.end();
      console.log('✅ 数据库连接已关闭');
    }
  }
}

module.exports = MigrationManager;