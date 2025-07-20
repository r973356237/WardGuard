const mysql = require('mysql2/promise');

// 加载环境配置
const dotenv = require('dotenv');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
console.log('加载环境配置:', envFile);
dotenv.config({ path: envFile, debug: true });

async function addStatusColumn() {
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

        // 首先检查status字段是否已存在
        console.log('\n检查status字段是否存在...');
        const [columns] = await connection.execute("SHOW COLUMNS FROM users LIKE 'status'");
        
        if (columns.length > 0) {
            console.log('status字段已存在！');
            console.table(columns);
        } else {
            console.log('status字段不存在，开始添加...');
            
            // 添加status字段
            const addColumnSQL = "ALTER TABLE users ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active' AFTER role";
            console.log('执行SQL:', addColumnSQL);
            await connection.execute(addColumnSQL);
            console.log('✅ status字段添加成功！');

            // 更新现有用户的状态
            const updateSQL = "UPDATE users SET status = 'active' WHERE status IS NULL";
            console.log('执行SQL:', updateSQL);
            const [updateResult] = await connection.execute(updateSQL);
            console.log('✅ 更新现有用户状态成功！影响行数:', updateResult.affectedRows);

            // 添加注释
            const commentSQL = "ALTER TABLE users MODIFY COLUMN status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '用户状态：active-激活，inactive-未激活'";
            console.log('执行SQL:', commentSQL);
            await connection.execute(commentSQL);
            console.log('✅ 字段注释添加成功！');
        }

        // 最后查看表结构
        console.log('\n最终表结构:');
        const [rows] = await connection.execute('DESCRIBE users');
        console.table(rows);

    } catch (error) {
        console.error('❌ 执行过程中出错:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('数据库连接已关闭');
        }
    }
}

// 执行函数
addStatusColumn().catch(console.error);