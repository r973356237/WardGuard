const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 加载环境配置
const dotenv = require('dotenv');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
console.log('加载环境配置:', envFile);
dotenv.config({ path: envFile, debug: true });

async function executeSQLFile() {
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

        // 读取SQL文件
        const sqlFile = path.join(__dirname, 'add_status_to_users.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');
        
        // 分割SQL语句（按分号分割，过滤空语句和注释）
        const sqlStatements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== 'DESCRIBE users');

        console.log('准备执行的SQL语句：');
        sqlStatements.forEach((stmt, index) => {
            console.log(`${index + 1}. ${stmt}`);
        });

        // 逐个执行SQL语句
        for (let i = 0; i < sqlStatements.length; i++) {
            const statement = sqlStatements[i];
            try {
                console.log(`\n执行语句 ${i + 1}:`, statement);
                const [result] = await connection.execute(statement);
                console.log('执行成功:', result);
            } catch (error) {
                if (error.code === 'ER_DUP_FIELDNAME') {
                    console.log('字段已存在，跳过:', statement);
                } else {
                    console.error('执行失败:', error.message);
                    throw error;
                }
            }
        }

        // 最后查看表结构
        console.log('\n查看表结构:');
        const [rows] = await connection.execute('DESCRIBE users');
        console.table(rows);

        console.log('\n所有SQL语句执行完成！');

    } catch (error) {
        console.error('执行过程中出错:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('数据库连接已关闭');
        }
    }
}

// 执行函数
executeSQLFile().catch(console.error);