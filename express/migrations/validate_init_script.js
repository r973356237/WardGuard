/**
 * 验证数据库初始化脚本的正确性
 * 检查脚本中定义的表结构是否与实际数据库结构一致
 */

const MigrationManager = require('./migration_manager');

async function validateInitScript() {
    const manager = new MigrationManager();
    
    try {
        await manager.connect();
        console.log('✅ 数据库连接成功');
        
        // 获取实际数据库中的表列表
        const [tables] = await manager.connection.execute(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE()
            ORDER BY TABLE_NAME
        `);
        
        console.log('\n📋 实际数据库表列表:');
        const actualTables = tables.map(row => row.TABLE_NAME);
        actualTables.forEach(table => console.log(`   ${table}`));
        
        // 定义初始化脚本中应该包含的表
        const expectedTables = [
            'users',
            'employees', 
            'medical_examinations',
            'medicines',
            'operation_records',
            'permissions',
            'user_permissions',
            'supplies',
            'email_config',
            'smtp_config',
            'email_logs',
            'scheduled_tasks',
            'system_config',
            'migrations'
        ];
        
        console.log('\n📋 初始化脚本应包含的表:');
        expectedTables.forEach(table => console.log(`   ${table}`));
        
        // 检查缺失的表
        const missingTables = expectedTables.filter(table => !actualTables.includes(table));
        const extraTables = actualTables.filter(table => !expectedTables.includes(table));
        
        console.log('\n🔍 验证结果:');
        
        if (missingTables.length > 0) {
            console.log('❌ 缺失的表:');
            missingTables.forEach(table => console.log(`   ${table}`));
        }
        
        if (extraTables.length > 0) {
            console.log('⚠️  额外的表（可能需要添加到初始化脚本）:');
            extraTables.forEach(table => console.log(`   ${table}`));
        }
        
        if (missingTables.length === 0 && extraTables.length === 0) {
            console.log('✅ 表结构完全匹配！');
        }
        
        // 检查所有表的字段结构
        console.log('\n🔍 检查所有表字段结构:\n');
        
        for (const tableName of actualTables) {
            try {
                const [fields] = await manager.connection.execute(`DESCRIBE ${tableName}`);
                console.log(`   📋 ${tableName} 表字段:`);
                fields.forEach(field => {
                    const keyInfo = field.Key ? ` [${field.Key}]` : '';
                    const nullInfo = field.Null === 'NO' ? ' NOT NULL' : '';
                    const defaultInfo = field.Default !== null ? ` DEFAULT(${field.Default})` : '';
                    console.log(`     ${field.Field} (${field.Type})${keyInfo}${nullInfo}${defaultInfo}`);
                });
                console.log('');
            } catch (error) {
                console.log(`     ❌ 无法获取 ${tableName} 表结构: ${error.message}`);
            }
        }
        
        // 检查权限数据
        const [permissionCount] = await manager.connection.execute('SELECT COUNT(*) as count FROM permissions');
        console.log(`\n📊 权限数据统计:`);
        console.log(`   总权限数: ${permissionCount[0].count}`);
        
        const [moduleStats] = await manager.connection.execute(`
            SELECT module, COUNT(*) as count 
            FROM permissions 
            GROUP BY module 
            ORDER BY module
        `);
        
        console.log('   按模块分布:');
        moduleStats.forEach(stat => {
            console.log(`     ${stat.module}: ${stat.count}个权限`);
        });
        
        console.log('\n✅ 数据库初始化脚本验证完成');
        
    } catch (error) {
        console.error('❌ 验证过程中出现错误:', error.message);
        throw error;
    } finally {
        await manager.close();
        console.log('✅ 数据库连接已关闭');
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    validateInitScript().catch(error => {
        console.error('验证失败:', error);
        process.exit(1);
    });
}

module.exports = { validateInitScript };