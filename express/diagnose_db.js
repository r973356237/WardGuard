
const mysql = require('mysql2/promise');
const path = require('path');

// 加载环境变量配置（参考 config.js 的方式）
const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;
const envPath = path.resolve(__dirname, envFile);
const fs = require('fs');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  require('dotenv').config();
}

async function diagnose() {
  // 从环境变量读取数据库连接信息，不再硬编码敏感凭据
  const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'wardguard',
  };

  if (!config.host || !config.user || !config.password) {
    console.error('错误：数据库连接信息未配置，请检查 .env 文件中的 DB_HOST、DB_USER、DB_PASSWORD');
    process.exit(1);
  }

  try {
    console.log('Connecting to database...');
    // First connect without database to check if it exists or list them
    const connection = await mysql.createConnection({
        host: config.host,
        user: config.user,
        password: config.password
    });
    
    console.log('Connected! Checking databases...');
    const [dbs] = await connection.execute('SHOW DATABASES');
    console.log('Databases:', dbs.map(d => d.Database).join(', '));

    // Assuming 'wardguard' or similar exists. Let's try to switch to it.
    let dbName = dbs.find(d => d.Database.toLowerCase().includes('ward'))?.Database || 'wardguard';
    console.log(`Using database: ${dbName}`);
    await connection.changeUser({ database: dbName });

    // 1. Check Date/Time settings
    console.log('\n--- Timezone Info ---');
    const [timeResult] = await connection.execute(`
      SELECT 
        NOW() as db_now, 
        CURDATE() as db_curdate, 
        @@global.time_zone as global_tz, 
        @@session.time_zone as session_tz
    `);
    console.log(timeResult[0]);

    // 2. Check Medicines
    console.log('\n--- Medicines (Expiring Soon Logic Check) ---');
    // Logic from dashboardController:
    // Expiring Soon: validity > 0 AND (prod + valid) >= CURDATE() AND (prod + valid) <= CURDATE() + 30
    const [medicines] = await connection.execute(`
      SELECT 
        id, 
        medicine_name, 
        production_date, 
        validity_period_days,
        DATE_ADD(production_date, INTERVAL validity_period_days DAY) as exp_date,
        DATEDIFF(DATE_ADD(production_date, INTERVAL validity_period_days DAY), CURDATE()) as days_left,
        CASE 
                  WHEN validity_period_days > 0 AND DATE_ADD(production_date, INTERVAL validity_period_days DAY) < CURDATE() THEN 'EXPIRED'
                  WHEN validity_period_days > 0 
                    AND DATE_ADD(production_date, INTERVAL validity_period_days DAY) > CURDATE() 
                    AND DATE_ADD(production_date, INTERVAL validity_period_days DAY) <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) 
                  THEN 'EXPIRING_SOON'
                  ELSE 'NORMAL'
                END as status
      FROM medicines
      WHERE validity_period_days > 0
      ORDER BY days_left ASC
    `);
    
    console.log('Medicines found:', medicines.length);
    medicines.filter(m => m.status === 'EXPIRING_SOON' || (m.days_left !== null && m.days_left < 60)).forEach(m => {
        const expDateStr = m.exp_date ? new Date(m.exp_date).toISOString().split('T')[0] : 'N/A';
        console.log(`[${m.status}] ${m.medicine_name}: Exp: ${expDateStr}, Days Left: ${m.days_left}`);
    });

    // 3. Check Supplies
    console.log('\n--- Supplies (Expiring Soon Logic Check) ---');
    const [supplies] = await connection.execute(`
      SELECT 
        id, 
        supply_name, 
        production_date, 
        validity_period_days,
        DATE_ADD(production_date, INTERVAL validity_period_days DAY) as exp_date,
        DATEDIFF(DATE_ADD(production_date, INTERVAL validity_period_days DAY), CURDATE()) as days_left,
        CASE 
          WHEN validity_period_days > 0 AND DATE_ADD(production_date, INTERVAL validity_period_days DAY) <= CURDATE() THEN 'EXPIRED'
          WHEN validity_period_days > 0 
            AND DATE_ADD(production_date, INTERVAL validity_period_days DAY) > CURDATE() 
            AND DATE_ADD(production_date, INTERVAL validity_period_days DAY) <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) 
          THEN 'EXPIRING_SOON'
          ELSE 'NORMAL'
        END as status
      FROM supplies
      WHERE validity_period_days > 0
      ORDER BY days_left ASC
    `);

    console.log('Supplies found:', supplies.length);
    supplies.filter(s => s.status === 'EXPIRING_SOON' || (s.days_left !== null && s.days_left < 60)).forEach(s => {
        const expDateStr = s.exp_date ? new Date(s.exp_date).toISOString().split('T')[0] : 'N/A';
        console.log(`[${s.status}] ${s.supply_name}: Exp: ${expDateStr}, Days Left: ${s.days_left}`);
    });

    await connection.end();

  } catch (err) {
    console.error('Error:', err);
  }
}

diagnose();
