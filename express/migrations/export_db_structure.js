const MigrationManager = require('./migration_manager');

/**
 * 数据库结构导出工具
 * 用于生成与实际数据库一致的初始化脚本
 */
async function exportDatabaseStructure() {
  const migrationManager = new MigrationManager();
  
  try {
    await migrationManager.connect();
    
    console.log('🔍 正在分析数据库结构...\n');
    
    // 获取所有表
    const [tables] = await migrationManager.connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `, [migrationManager.dbConfig.database]);
    
    console.log(`📋 数据库中共有 ${tables.length} 个表:`);
    tables.forEach(table => {
      console.log(`   ${table.TABLE_NAME}`);
    });
    
    console.log('\n📝 生成表结构SQL...\n');
    
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      
      // 跳过迁移记录表
      if (tableName === 'migrations') {
        continue;
      }
      
      console.log(`\n-- ========== ${tableName} 表 ==========`);
      
      // 获取表结构
      const [createTable] = await migrationManager.connection.execute(`SHOW CREATE TABLE ${tableName}`);
      console.log(createTable[0]['Create Table'] + ';');
      
      // 获取表数据（仅对特定表）
      if (['users', 'permissions', 'user_permissions', 'email_config', 'smtp_config'].includes(tableName)) {
        const [rows] = await migrationManager.connection.execute(`SELECT * FROM ${tableName}`);
        
        if (rows.length > 0) {
          console.log(`\n-- ${tableName} 表数据`);
          
          // 获取列名
          const columns = Object.keys(rows[0]);
          const columnList = columns.join(', ');
          
          for (const row of rows) {
            const values = columns.map(col => {
              const value = row[col];
              if (value === null) return 'NULL';
              if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
              if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
              return value;
            }).join(', ');
            
            console.log(`INSERT IGNORE INTO ${tableName} (${columnList}) VALUES (${values});`);
          }
        }
      }
    }
    
    // 获取索引信息
    console.log('\n\n-- ========== 索引信息 ==========');
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      
      if (tableName === 'migrations') continue;
      
      const [indexes] = await migrationManager.connection.execute(`
        SELECT DISTINCT INDEX_NAME, COLUMN_NAME, NON_UNIQUE
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        AND INDEX_NAME != 'PRIMARY'
        ORDER BY INDEX_NAME, SEQ_IN_INDEX
      `, [migrationManager.dbConfig.database, tableName]);
      
      if (indexes.length > 0) {
        console.log(`\n-- ${tableName} 表索引`);
        const indexGroups = {};
        
        indexes.forEach(idx => {
          if (!indexGroups[idx.INDEX_NAME]) {
            indexGroups[idx.INDEX_NAME] = {
              columns: [],
              unique: idx.NON_UNIQUE === 0
            };
          }
          indexGroups[idx.INDEX_NAME].columns.push(idx.COLUMN_NAME);
        });
        
        Object.entries(indexGroups).forEach(([indexName, info]) => {
          const uniqueStr = info.unique ? 'UNIQUE ' : '';
          const columns = info.columns.join(', ');
          console.log(`CREATE ${uniqueStr}INDEX ${indexName} ON ${tableName}(${columns});`);
        });
      }
    }
    
    console.log('\n\n🎉 数据库结构导出完成！');
    
  } catch (error) {
    console.error('❌ 导出失败:', error.message);
    throw error;
  } finally {
    await migrationManager.close();
  }
}

// 执行导出
exportDatabaseStructure().catch(error => {
  console.error('❌ 导出过程中发生错误:', error);
  process.exit(1);
});

module.exports = { exportDatabaseStructure };