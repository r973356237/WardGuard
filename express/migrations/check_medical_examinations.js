const MigrationManager = require('./migration_manager');

async function checkMedicalExaminationsTable() {
    const manager = new MigrationManager();
    
    try {
        await manager.connect();
        console.log('✅ 数据库连接成功\n');
        
        const [fields] = await manager.connection.execute('DESCRIBE medical_examinations');
        console.log('📋 medical_examinations 表实际结构:');
        fields.forEach((field, index) => {
            const keyInfo = field.Key ? ` [${field.Key}]` : '';
            const nullInfo = field.Null === 'NO' ? ' NOT NULL' : '';
            const defaultInfo = field.Default !== null ? ` DEFAULT(${field.Default})` : '';
            const extraInfo = field.Extra ? ` ${field.Extra}` : '';
            console.log(`  ${index + 1}. ${field.Field}`);
            console.log(`     类型: ${field.Type}${keyInfo}${nullInfo}${defaultInfo}${extraInfo}`);
        });
        
        // 获取索引信息
        const [indexes] = await manager.connection.execute('SHOW INDEX FROM medical_examinations');
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
                const uniqueInfo = indexType.Non_unique === 0 ? ' [UNIQUE]' : '';
                console.log(`  - ${indexName}: (${columns.join(', ')})${uniqueInfo}`);
            });
        }
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
    } finally {
        await manager.close();
        console.log('\n✅ 数据库连接已关闭');
    }
}

checkMedicalExaminationsTable();