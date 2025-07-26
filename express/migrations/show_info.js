const MigrationManager = require('./migration_manager');

/**
 * 数据库信息查看工具
 */
async function showDatabaseInfo() {
  const migrationManager = new MigrationManager();
  
  try {
    await migrationManager.connect();
    
    console.log('📊 数据库信息概览\n');
    
    // 显示用户信息
    console.log('👥 用户信息:');
    const [users] = await migrationManager.connection.execute(`
      SELECT username, name, role, status, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    
    if (users.length === 0) {
      console.log('   暂无用户数据');
    } else {
      users.forEach(user => {
        const date = new Date(user.created_at).toLocaleDateString('zh-CN');
        console.log(`   ${user.username} (${user.name}) - ${user.role} - ${user.status} - ${date}`);
      });
    }
    
    // 显示权限统计
    console.log('\n🔐 权限统计:');
    const [permissionStats] = await migrationManager.connection.execute(`
      SELECT module, COUNT(*) as count 
      FROM permissions 
      GROUP BY module 
      ORDER BY count DESC
    `);
    
    permissionStats.forEach(stat => {
      console.log(`   ${stat.module}: ${stat.count}个权限`);
    });
    
    // 显示用户权限分配
    console.log('\n👤 用户权限分配:');
    const [userPermissions] = await migrationManager.connection.execute(`
      SELECT u.username, u.name, COUNT(up.permission_id) as permission_count
      FROM users u
      LEFT JOIN user_permissions up ON u.id = up.user_id
      GROUP BY u.id, u.username, u.name
      ORDER BY permission_count DESC
    `);
    
    userPermissions.forEach(up => {
      console.log(`   ${up.username} (${up.name}): ${up.permission_count}个权限`);
    });
    
    // 显示邮件配置
    console.log('\n📧 邮件配置:');
    const [emailConfigs] = await migrationManager.connection.execute(`
      SELECT recipient_email, reminder_frequency, reminder_time 
      FROM email_config
    `);
    
    if (emailConfigs.length === 0) {
      console.log('   暂无邮件配置');
    } else {
      emailConfigs.forEach(config => {
        console.log(`   收件人: ${config.recipient_email}, 频率: ${config.reminder_frequency}, 时间: ${config.reminder_time}`);
      });
    }
    
    // 显示SMTP配置状态
    console.log('\n📮 SMTP配置:');
    const [smtpConfigs] = await migrationManager.connection.execute(`
      SELECT smtp_host, smtp_port, smtp_user, is_active 
      FROM smtp_config
    `);
    
    if (smtpConfigs.length === 0) {
      console.log('   暂无SMTP配置');
    } else {
      smtpConfigs.forEach(config => {
        const status = config.is_active ? '启用' : '禁用';
        console.log(`   ${config.smtp_host}:${config.smtp_port} (${config.smtp_user}) - ${status}`);
      });
    }
    
    // 显示迁移历史
    console.log('\n📋 迁移历史:');
    const [migrations] = await migrationManager.connection.execute(`
      SELECT migration_name, executed_at 
      FROM migrations 
      ORDER BY executed_at DESC 
      LIMIT 5
    `);
    
    migrations.forEach(migration => {
      const date = new Date(migration.executed_at).toLocaleString('zh-CN');
      console.log(`   ${migration.migration_name} - ${date}`);
    });
    
    console.log('\n✅ 数据库信息查看完成');
    
  } catch (error) {
    console.error('❌ 查看数据库信息失败:', error.message);
  } finally {
    await migrationManager.close();
  }
}

// 命令行执行
if (require.main === module) {
  showDatabaseInfo();
}

module.exports = { showDatabaseInfo };