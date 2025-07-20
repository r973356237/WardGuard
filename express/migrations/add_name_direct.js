const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 加载环境配置
const dotenv = require('dotenv');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
console.log('加载环境配置:', envFile);
dotenv.config({ path: envFile, debug: true });

async function addNameColumn() {
    let connection;
    try {
        // 创建数据库连接
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });

        console.log('数据库连接成功！');

        // 首先检查name字段是否已存在
        console.log('\n检查name字段是否存在...');
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'name'
        `, [process.env.DB_NAME]);

        if (columns.length > 0) {
            console.log('name字段已存在，跳过添加');
            return;
        }

        console.log('name字段不存在，开始添加...');

        // 读取SQL文件
        const sqlFile = path.join(__dirname, 'add_name_to_users.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');
        
        // 分割SQL语句（按分号分割，过滤空语句和注释）
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt && !stmt.startsWith('--'));

        // 执行每个SQL语句
        for (const statement of statements) {
            if (statement) {
                console.log('执行SQL:', statement.substring(0, 50) + '...');
                await connection.execute(statement);
            }
        }

        console.log('\n✅ name字段添加成功！');

    } catch (error) {
        console.error('❌ 添加name字段失败:', error.message);
        if (process.env.NODE_ENV === 'development') {
            console.error('详细错误:', error);
        }
    } finally {
        if (connection) {
            await connection.end();
            console.log('数据库连接已关闭');
        }
    }
}

// 执行迁移
addNameColumn();