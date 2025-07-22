const MigrationManager = require('./migration_manager');
const path = require('path');

/**
 * 操作记录表迁移
 */
async function migrateOperationRecords() {
  const migrationManager = new MigrationManager();
  
  try {
    // 连接数据库
    await migrationManager.connect();
    
    // 执行迁移
    const sqlFilePath = path.join(__dirname, 'create_operation_records_table.sql');
    await migrationManager.runMigration('create_operation_records_table', sqlFilePath);
    
    console.log('✅ 操作记录表迁移完成');
  } catch (error) {
    console.error('❌ 操作记录表迁移失败:', error);
    process.exit(1);
  } finally {
    // 关闭连接
    await migrationManager.close();
  }
}

// 如果直接运行此文件，则执行迁移
if (require.main === module) {
  migrateOperationRecords();
}

module.exports = migrateOperationRecords;