const MigrationManager = require('./migration_manager');
const path = require('path');

/**
 * 执行添加name字段的迁移
 */
async function runAddNameMigration() {
  const migrationManager = new MigrationManager();
  
  try {
    await migrationManager.connect();
    
    const migrationName = 'add_name_to_users_v2';
    const sqlFilePath = path.join(__dirname, 'add_name_to_users.sql');
    
    // 先检查字段是否已存在
    const nameExists = await migrationManager.columnExists('users', 'name');
    
    if (nameExists) {
      console.log('✅ name字段已存在，无需迁移');
      return;
    }
    
    // 执行迁移
    await migrationManager.runMigration(migrationName, sqlFilePath);
    
    // 验证迁移结果
    const nameExistsAfter = await migrationManager.columnExists('users', 'name');
    if (nameExistsAfter) {
      console.log('✅ name字段迁移验证成功');
    } else {
      throw new Error('迁移后字段验证失败');
    }
    
  } catch (error) {
    console.error('❌ 迁移执行失败:', error.message);
    process.exit(1);
  } finally {
    await migrationManager.close();
  }
}

// 执行迁移
if (require.main === module) {
  runAddNameMigration();
}

module.exports = runAddNameMigration;