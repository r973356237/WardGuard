const MigrationManager = require('./migration_manager');
const path = require('path');

/**
 * 数据库迁移执行脚本
 * 按顺序执行所有迁移文件
 */
async function runMigrations() {
  const migrationManager = new MigrationManager();
  
  try {
    console.log('🚀 开始执行数据库迁移...');
    
    // 连接数据库
    await migrationManager.connect();
    
    // 定义迁移执行顺序（重要：按依赖关系排序）
    const migrations = [
      {
        name: 'create_permissions_tables',
        file: 'create_permissions_tables.sql',
        description: '创建权限表和用户权限关联表'
      },
      {
        name: 'add_name_to_users',
        file: 'add_name_to_users.sql',
        description: '为用户表添加姓名字段'
      },
      {
        name: 'add_status_to_users',
        file: 'add_status_to_users.sql',
        description: '为用户表添加状态字段'
      },
      {
        name: 'create_smtp_config_table',
        file: 'create_smtp_config_table.sql',
        description: '创建SMTP配置表'
      },
      {
        name: 'create_email_tables',
        file: 'create_email_tables.sql',
        description: '创建邮件配置和日志表'
      },
      {
        name: 'create_operation_records_table',
        file: 'create_operation_records_table.sql',
        description: '创建操作记录表'
      },
      {
        name: 'add_weekly_monthly_day_fields_fixed',
        file: 'add_weekly_monthly_day_fields_fixed.sql',
        description: '为邮件配置表添加周期字段（修复版）'
      },
      {
        name: 'remove_smtp_fields_from_email_config_fixed',
        file: 'remove_smtp_fields_from_email_config_fixed.sql',
        description: '从邮件配置表移除SMTP字段（修复版）'
      },
      {
        name: 'init_default_data',
        file: 'init_default_data.sql',
        description: '初始化默认数据（管理员用户、权限等）'
      }
    ];
    
    // 执行迁移
    for (const migration of migrations) {
      const sqlFilePath = path.join(__dirname, migration.file);
      console.log(`\n📋 ${migration.description}`);
      await migrationManager.runMigration(migration.name, sqlFilePath);
    }
    
    console.log('\n🎉 所有数据库迁移执行完成！');
    
    // 显示迁移历史
    await showMigrationHistory(migrationManager);
    
  } catch (error) {
    console.error('\n❌ 迁移执行失败:', error.message);
    console.error('💡 请检查以下项目:');
    console.error('   1. 数据库连接是否正常');
    console.error('   2. 数据库用户是否有足够权限');
    console.error('   3. SQL语法是否正确');
    console.error('   4. 表结构是否存在冲突');
    process.exit(1);
  } finally {
    await migrationManager.close();
  }
}

/**
 * 显示迁移历史
 */
async function showMigrationHistory(migrationManager) {
  try {
    const [rows] = await migrationManager.connection.execute(`
      SELECT migration_name, executed_at 
      FROM migrations 
      ORDER BY executed_at DESC 
      LIMIT 10
    `);
    
    console.log('\n📊 最近执行的迁移:');
    console.log('─'.repeat(60));
    
    if (rows.length === 0) {
      console.log('暂无迁移记录');
    } else {
      rows.forEach(row => {
        const date = new Date(row.executed_at).toLocaleString('zh-CN');
        console.log(`✅ ${row.migration_name.padEnd(35)} ${date}`);
      });
    }
    
    console.log('─'.repeat(60));
  } catch (error) {
    console.error('❌ 获取迁移历史失败:', error.message);
  }
}

/**
 * 检查数据库状态
 */
async function checkDatabaseStatus() {
  const migrationManager = new MigrationManager();
  
  try {
    await migrationManager.connect();
    
    console.log('🔍 检查数据库状态...');
    
    // 检查关键表是否存在
    const tables = ['users', 'permissions', 'user_permissions', 'email_config', 'smtp_config'];
    
    for (const table of tables) {
      const [rows] = await migrationManager.connection.execute(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = ? AND table_name = ?
      `, [migrationManager.dbConfig.database, table]);
      
      const exists = rows[0].count > 0;
      console.log(`${exists ? '✅' : '❌'} 表 ${table}: ${exists ? '存在' : '不存在'}`);
    }
    
  } catch (error) {
    console.error('❌ 数据库状态检查失败:', error.message);
  } finally {
    await migrationManager.close();
  }
}

// 命令行参数处理
const command = process.argv[2];

switch (command) {
  case 'run':
    runMigrations();
    break;
  case 'status':
    checkDatabaseStatus();
    break;
  default:
    console.log('📖 使用方法:');
    console.log('  node run_migrations.js run     - 执行所有迁移');
    console.log('  node run_migrations.js status  - 检查数据库状态');
    break;
}