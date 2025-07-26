const MigrationManager = require('./migration_manager');

/**
 * 权限修复工具
 * 为管理员用户分配所有权限
 */
async function fixAdminPermissions() {
  const migrationManager = new MigrationManager();
  
  try {
    await migrationManager.connect();
    
    console.log('🔧 开始修复管理员权限...\n');
    
    // 查找所有管理员用户
    const [adminUsers] = await migrationManager.connection.execute(`
      SELECT id, username, name FROM users WHERE role = 'admin'
    `);
    
    if (adminUsers.length === 0) {
      console.log('❌ 没有找到管理员用户');
      return;
    }
    
    console.log(`📋 找到 ${adminUsers.length} 个管理员用户:`);
    adminUsers.forEach(admin => {
      console.log(`   ${admin.username} (${admin.name})`);
    });
    
    // 获取所有权限
    const [permissions] = await migrationManager.connection.execute(`
      SELECT id, code, name FROM permissions ORDER BY module, code
    `);
    
    console.log(`\n🔐 系统共有 ${permissions.length} 个权限`);
    
    // 为每个管理员分配所有权限
    for (const admin of adminUsers) {
      console.log(`\n👤 处理管理员: ${admin.username} (${admin.name})`);
      
      // 检查当前权限
      const [currentPermissions] = await migrationManager.connection.execute(`
        SELECT COUNT(*) as count FROM user_permissions WHERE user_id = ?
      `, [admin.id]);
      
      console.log(`   当前权限数: ${currentPermissions[0].count}`);
      
      // 删除现有权限（避免重复）
      await migrationManager.connection.execute(`
        DELETE FROM user_permissions WHERE user_id = ?
      `, [admin.id]);
      
      console.log('   已清除现有权限');
      
      // 分配所有权限
      const insertPromises = permissions.map(permission => {
        return migrationManager.connection.execute(`
          INSERT INTO user_permissions (user_id, permission_id, granted_by) 
          VALUES (?, ?, ?)
        `, [admin.id, permission.id, admin.id]);
      });
      
      await Promise.all(insertPromises);
      
      console.log(`   ✅ 已分配 ${permissions.length} 个权限`);
    }
    
    // 验证结果
    console.log('\n📊 权限分配结果验证:');
    for (const admin of adminUsers) {
      const [result] = await migrationManager.connection.execute(`
        SELECT COUNT(*) as count FROM user_permissions WHERE user_id = ?
      `, [admin.id]);
      
      console.log(`   ${admin.username}: ${result[0].count} 个权限`);
    }
    
    console.log('\n🎉 管理员权限修复完成！');
    
  } catch (error) {
    console.error('❌ 权限修复失败:', error.message);
    throw error;
  } finally {
    await migrationManager.close();
  }
}

/**
 * 为指定用户分配权限
 */
async function assignPermissionsToUser(username, permissionCodes) {
  const migrationManager = new MigrationManager();
  
  try {
    await migrationManager.connect();
    
    console.log(`🔧 为用户 ${username} 分配权限...\n`);
    
    // 查找用户
    const [users] = await migrationManager.connection.execute(`
      SELECT id, username, name FROM users WHERE username = ?
    `, [username]);
    
    if (users.length === 0) {
      throw new Error(`用户 ${username} 不存在`);
    }
    
    const user = users[0];
    console.log(`👤 用户: ${user.username} (${user.name})`);
    
    // 查找权限
    const [permissions] = await migrationManager.connection.execute(`
      SELECT id, code, name FROM permissions WHERE code IN (${permissionCodes.map(() => '?').join(',')})
    `, permissionCodes);
    
    console.log(`🔐 找到 ${permissions.length} 个权限:`);
    permissions.forEach(perm => {
      console.log(`   ${perm.code} - ${perm.name}`);
    });
    
    // 分配权限
    for (const permission of permissions) {
      await migrationManager.connection.execute(`
        INSERT IGNORE INTO user_permissions (user_id, permission_id, granted_by) 
        VALUES (?, ?, ?)
      `, [user.id, permission.id, user.id]);
    }
    
    console.log(`\n✅ 权限分配完成！`);
    
  } catch (error) {
    console.error('❌ 权限分配失败:', error.message);
    throw error;
  } finally {
    await migrationManager.close();
  }
}

// 命令行参数处理
const command = process.argv[2];

switch (command) {
  case 'fix-admin':
    fixAdminPermissions();
    break;
  case 'assign':
    const username = process.argv[3];
    const permissions = process.argv.slice(4);
    if (!username || permissions.length === 0) {
      console.log('使用方法: node fix_permissions.js assign <username> <permission1> <permission2> ...');
    } else {
      assignPermissionsToUser(username, permissions);
    }
    break;
  default:
    console.log('📖 使用方法:');
    console.log('  node fix_permissions.js fix-admin                    - 修复所有管理员权限');
    console.log('  node fix_permissions.js assign <user> <perm1> ...    - 为用户分配指定权限');
    console.log('');
    console.log('示例:');
    console.log('  node fix_permissions.js fix-admin');
    console.log('  node fix_permissions.js assign fanjunkai users:view users:add');
    break;
}

module.exports = { fixAdminPermissions, assignPermissionsToUser };