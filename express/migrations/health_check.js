const MigrationManager = require('./migration_manager');

/**
 * 数据库健康检查和诊断工具
 */
class DatabaseHealthChecker {
  constructor() {
    this.migrationManager = new MigrationManager();
  }

  /**
   * 执行完整的健康检查
   */
  async runHealthCheck() {
    try {
      console.log('🏥 开始数据库健康检查...\n');
      
      await this.migrationManager.connect();
      
      // 检查项目列表
      const checks = [
        { name: '数据库连接', method: 'checkConnection' },
        { name: '核心表结构', method: 'checkCoreTables' },
        { name: '权限系统', method: 'checkPermissionSystem' },
        { name: '用户数据', method: 'checkUserData' },
        { name: '邮件配置', method: 'checkEmailConfig' },
        { name: '迁移历史', method: 'checkMigrationHistory' },
        { name: '数据完整性', method: 'checkDataIntegrity' }
      ];
      
      const results = [];
      
      for (const check of checks) {
        console.log(`🔍 检查 ${check.name}...`);
        try {
          const result = await this[check.method]();
          results.push({ name: check.name, status: 'success', ...result });
          console.log(`✅ ${check.name}: 正常\n`);
        } catch (error) {
          results.push({ name: check.name, status: 'error', error: error.message });
          console.log(`❌ ${check.name}: ${error.message}\n`);
        }
      }
      
      // 生成报告
      this.generateReport(results);
      
    } catch (error) {
      console.error('❌ 健康检查失败:', error.message);
    } finally {
      await this.migrationManager.close();
    }
  }

  /**
   * 检查数据库连接
   */
  async checkConnection() {
    const [rows] = await this.migrationManager.connection.execute('SELECT 1 as test');
    return { message: '数据库连接正常' };
  }

  /**
   * 检查核心表结构
   */
  async checkCoreTables() {
    const requiredTables = [
      'users', 'permissions', 'user_permissions', 
      'email_config', 'smtp_config', 'email_logs',
      'operation_records', 'scheduled_tasks', 'migrations'
    ];
    
    const missingTables = [];
    const existingTables = [];
    
    for (const table of requiredTables) {
      const [rows] = await this.migrationManager.connection.execute(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = ? AND table_name = ?
      `, [this.migrationManager.dbConfig.database, table]);
      
      if (rows[0].count > 0) {
        existingTables.push(table);
      } else {
        missingTables.push(table);
      }
    }
    
    if (missingTables.length > 0) {
      throw new Error(`缺少表: ${missingTables.join(', ')}`);
    }
    
    return { 
      message: `所有核心表存在 (${existingTables.length}个)`,
      tables: existingTables 
    };
  }

  /**
   * 检查权限系统
   */
  async checkPermissionSystem() {
    // 检查权限数据
    const [permissionRows] = await this.migrationManager.connection.execute(
      'SELECT COUNT(*) as count FROM permissions'
    );
    
    const permissionCount = permissionRows[0].count;
    
    if (permissionCount === 0) {
      throw new Error('权限表为空，需要初始化权限数据');
    }
    
    // 检查权限模块分布
    const [moduleRows] = await this.migrationManager.connection.execute(`
      SELECT module, COUNT(*) as count 
      FROM permissions 
      GROUP BY module 
      ORDER BY count DESC
    `);
    
    return {
      message: `权限系统正常，共${permissionCount}个权限`,
      permissionCount,
      modules: moduleRows
    };
  }

  /**
   * 检查用户数据
   */
  async checkUserData() {
    // 检查用户总数
    const [userRows] = await this.migrationManager.connection.execute(
      'SELECT COUNT(*) as count FROM users'
    );
    
    const userCount = userRows[0].count;
    
    // 检查管理员用户
    const [adminRows] = await this.migrationManager.connection.execute(
      "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
    );
    
    const adminCount = adminRows[0].count;
    
    if (adminCount === 0) {
      throw new Error('没有管理员用户，系统无法正常使用');
    }
    
    // 检查用户状态分布
    const [statusRows] = await this.migrationManager.connection.execute(`
      SELECT status, COUNT(*) as count 
      FROM users 
      GROUP BY status
    `);
    
    return {
      message: `用户数据正常，共${userCount}个用户，${adminCount}个管理员`,
      userCount,
      adminCount,
      statusDistribution: statusRows
    };
  }

  /**
   * 检查邮件配置
   */
  async checkEmailConfig() {
    // 检查SMTP配置
    const [smtpRows] = await this.migrationManager.connection.execute(
      'SELECT COUNT(*) as count FROM smtp_config WHERE is_active = TRUE'
    );
    
    // 检查邮件配置
    const [emailRows] = await this.migrationManager.connection.execute(
      'SELECT COUNT(*) as count FROM email_config'
    );
    
    const activeSmtpCount = smtpRows[0].count;
    const emailConfigCount = emailRows[0].count;
    
    return {
      message: `邮件配置检查完成，${activeSmtpCount}个活跃SMTP配置，${emailConfigCount}个邮件配置`,
      activeSmtpCount,
      emailConfigCount,
      warning: activeSmtpCount === 0 ? '没有活跃的SMTP配置，邮件功能可能无法使用' : null
    };
  }

  /**
   * 检查迁移历史
   */
  async checkMigrationHistory() {
    const [rows] = await this.migrationManager.connection.execute(`
      SELECT COUNT(*) as count FROM migrations
    `);
    
    const migrationCount = rows[0].count;
    
    if (migrationCount === 0) {
      throw new Error('没有迁移记录，数据库可能未正确初始化');
    }
    
    // 获取最近的迁移
    const [recentRows] = await this.migrationManager.connection.execute(`
      SELECT migration_name, executed_at 
      FROM migrations 
      ORDER BY executed_at DESC 
      LIMIT 3
    `);
    
    return {
      message: `迁移历史正常，共执行${migrationCount}次迁移`,
      migrationCount,
      recentMigrations: recentRows
    };
  }

  /**
   * 检查数据完整性
   */
  async checkDataIntegrity() {
    const issues = [];
    
    // 检查外键约束
    try {
      const [orphanPermissions] = await this.migrationManager.connection.execute(`
        SELECT COUNT(*) as count 
        FROM user_permissions up 
        LEFT JOIN users u ON up.user_id = u.id 
        LEFT JOIN permissions p ON up.permission_id = p.id 
        WHERE u.id IS NULL OR p.id IS NULL
      `);
      
      if (orphanPermissions[0].count > 0) {
        issues.push(`发现${orphanPermissions[0].count}个孤立的用户权限记录`);
      }
    } catch (error) {
      issues.push(`权限关联检查失败: ${error.message}`);
    }
    
    if (issues.length > 0) {
      throw new Error(issues.join('; '));
    }
    
    return { message: '数据完整性检查通过' };
  }

  /**
   * 生成健康检查报告
   */
  generateReport(results) {
    console.log('\n📊 数据库健康检查报告');
    console.log('='.repeat(60));
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    console.log(`总检查项: ${results.length}`);
    console.log(`✅ 通过: ${successCount}`);
    console.log(`❌ 失败: ${errorCount}`);
    console.log('='.repeat(60));
    
    // 显示详细结果
    results.forEach(result => {
      const icon = result.status === 'success' ? '✅' : '❌';
      console.log(`${icon} ${result.name}`);
      
      if (result.status === 'error') {
        console.log(`   错误: ${result.error}`);
      } else if (result.warning) {
        console.log(`   ⚠️  警告: ${result.warning}`);
      }
    });
    
    console.log('='.repeat(60));
    
    if (errorCount === 0) {
      console.log('🎉 数据库健康状况良好！');
    } else {
      console.log('⚠️  发现问题，建议检查并修复');
    }
  }
}

// 命令行执行
if (require.main === module) {
  const checker = new DatabaseHealthChecker();
  checker.runHealthCheck();
}

module.exports = DatabaseHealthChecker;