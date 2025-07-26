const MigrationManager = require('./migration_manager');

async function compareStructures() {
    const manager = new MigrationManager();
    
    try {
        await manager.connect();
        console.log('✅ 数据库连接成功\n');
        
        // 获取所有表
        const [tables] = await manager.connection.execute('SHOW TABLES');
        const tableNames = tables.map(row => Object.values(row)[0]).sort();
        
        console.log('📋 数据库结构详细对比报告\n');
        console.log('=' * 60);
        
        for (const tableName of tableNames) {
            console.log(`\n🔍 表: ${tableName}`);
            console.log('-' * 40);
            
            // 获取表结构
            const [fields] = await manager.connection.execute(`DESCRIBE ${tableName}`);
            
            console.log('字段列表:');
            fields.forEach((field, index) => {
                const keyInfo = field.Key ? ` [${field.Key}]` : '';
                const nullInfo = field.Null === 'NO' ? ' NOT NULL' : '';
                const defaultInfo = field.Default !== null ? ` DEFAULT(${field.Default})` : '';
                const extraInfo = field.Extra ? ` ${field.Extra}` : '';
                
                console.log(`  ${index + 1}. ${field.Field}`);
                console.log(`     类型: ${field.Type}${keyInfo}${nullInfo}${defaultInfo}${extraInfo}`);
            });
            
            // 获取索引信息
            const [indexes] = await manager.connection.execute(`SHOW INDEX FROM ${tableName}`);
            if (indexes.length > 0) {
                console.log('\n索引信息:');
                const indexGroups = {};
                indexes.forEach(idx => {
                    if (!indexGroups[idx.Key_name]) {
                        indexGroups[idx.Key_name] = [];
                    }
                    indexGroups[idx.Key_name].push(idx.Column_name);
                });
                
                Object.entries(indexGroups).forEach(([indexName, columns]) => {
                    const indexType = indexes.find(idx => idx.Key_name === indexName);
                    const typeInfo = indexType.Index_type || '';
                    const uniqueInfo = indexType.Non_unique === 0 ? ' [UNIQUE]' : '';
                    console.log(`  - ${indexName}: (${columns.join(', ')})${uniqueInfo} ${typeInfo}`);
                });
            }
        }
        
        console.log('\n' + '=' * 60);
        console.log('✅ 数据库结构对比完成');
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
    } finally {
        await manager.close();
        console.log('✅ 数据库连接已关闭');
    }
}

// 运行对比
compareStructures();