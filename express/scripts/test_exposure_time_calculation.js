const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

// 创建数据库连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wardguard',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function testExposureTimeCalculation() {
  try {
    console.log('开始测试总接害时间计算...');
    
    // 获取一个测试员工数据
    const [employees] = await pool.execute('SELECT * FROM employees LIMIT 5');
    
    if (employees.length === 0) {
      console.log('没有找到员工数据进行测试');
      return;
    }
    
    console.log('测试员工数据:');
    
    for (const employee of employees) {
      console.log(`\n员工ID: ${employee.id}, 姓名: ${employee.name}`);
      console.log(`入职时间: ${employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : '无'}`);
      console.log(`参加工作时间: ${employee.work_start_date ? new Date(employee.work_start_date).toLocaleDateString() : '无'}`);
      console.log(`入职前接害时间: ${employee.pre_hire_exposure_time || 0} 年`);
      console.log(`数据库中的总接害时间: ${employee.total_exposure_time || 0} 年`);
      
      // 计算总接害时间：当前时间-入职时间+入职前接害时间
      let calculatedTotalExposureTime = 0;
      if (employee.hire_date) {
        const hireDate = new Date(employee.hire_date);
        const currentDate = new Date();
        // 计算工作年限（毫秒转换为年）
        const workYears = (currentDate - hireDate) / (1000 * 60 * 60 * 24 * 365.25);
        // 总接害时间 = 工作年限 + 入职前接害时间
        calculatedTotalExposureTime = workYears + (parseFloat(employee.pre_hire_exposure_time) || 0);
        // 保留一位小数
        calculatedTotalExposureTime = parseFloat(calculatedTotalExposureTime.toFixed(1));
      } else {
        // 如果没有入职时间，则只计算入职前接害时间
        calculatedTotalExposureTime = parseFloat(employee.pre_hire_exposure_time) || 0;
      }
      
      console.log(`计算得到的总接害时间: ${calculatedTotalExposureTime} 年`);
      console.log(`四舍五入到0.5的倍数后: ${Math.round(calculatedTotalExposureTime * 2) / 2} 年`);
    }
    
    // 关闭连接池
    await pool.end();
    
    console.log('\n测试完成');
  } catch (error) {
    console.error('测试过程中出错:', error);
    process.exit(1);
  }
}

// 执行测试
testExposureTimeCalculation();