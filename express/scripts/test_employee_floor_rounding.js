/**
 * 测试员工数据的只舍不入（不满0.5年的舍去）逻辑
 */
const db = require('../db');

// 只舍不入到0.5的倍数的函数
function floorToHalf(value) {
  // 使用Math.floor实现只舍不入到0.5的倍数
  const floorRoundedValue = Math.floor(value * 2) / 2;
  // 格式化显示（整数不显示小数点）
  return floorRoundedValue.toFixed(floorRoundedValue % 1 === 0 ? 0 : 1);
}

// 主函数
async function testEmployeeRounding() {
  try {
    console.log('连接数据库...');
    const pool = await db.getPool();
    console.log('数据库连接成功');

    // 获取所有员工数据
    const [employees] = await pool.execute('SELECT * FROM employees LIMIT 10');
    console.log(`获取到 ${employees.length} 名员工数据`);

    console.log('\n测试员工总接害时间的只舍不入逻辑：');
    console.log('员工ID | 姓名 | 原始总接害时间 | 只舍不入后的值');
    console.log('--------------------------------------------------');

    employees.forEach(employee => {
      const originalValue = employee.total_exposure_time;
      const floorRoundedValue = floorToHalf(originalValue);
      
      console.log(`${employee.id} | ${employee.name} | ${originalValue} | ${floorRoundedValue}`);
    });

    console.log('\n测试员工入职前接害时间的只舍不入逻辑：');
    console.log('员工ID | 姓名 | 原始入职前接害时间 | 只舍不入后的值');
    console.log('--------------------------------------------------');

    employees.forEach(employee => {
      const originalValue = employee.pre_hire_exposure_time;
      const floorRoundedValue = floorToHalf(originalValue);
      
      console.log(`${employee.id} | ${employee.name} | ${originalValue} | ${floorRoundedValue}`);
    });

    // 计算并显示当前时间 - 入职时间 + 入职前接害时间的结果
    console.log('\n计算当前时间 - 入职时间 + 入职前接害时间的结果：');
    console.log('员工ID | 姓名 | 入职时间 | 入职前接害时间 | 计算结果 | 只舍不入后的值');
    console.log('-------------------------------------------------------------------------');

    employees.forEach(employee => {
      if (employee.hire_date) {
        const hireDate = new Date(employee.hire_date);
        const currentDate = new Date();
        // 计算工作年限（毫秒转换为年）
        const workYears = (currentDate - hireDate) / (1000 * 60 * 60 * 24 * 365.25);
        // 总接害时间 = 工作年限 + 入职前接害时间
        const calculatedValue = workYears + (parseFloat(employee.pre_hire_exposure_time) || 0);
        // 保留一位小数
        const formattedValue = calculatedValue.toFixed(1);
        // 只舍不入到0.5的倍数
        const floorRoundedValue = floorToHalf(calculatedValue);
        
        console.log(`${employee.id} | ${employee.name} | ${employee.hire_date} | ${employee.pre_hire_exposure_time} | ${formattedValue} | ${floorRoundedValue}`);
      } else {
        console.log(`${employee.id} | ${employee.name} | 无入职时间 | ${employee.pre_hire_exposure_time} | ${employee.pre_hire_exposure_time} | ${floorToHalf(employee.pre_hire_exposure_time)}`);
      }
    });

    console.log('\n测试完成');
  } catch (error) {
    console.error('测试过程中出错:', error);
  } finally {
    // 关闭数据库连接
    process.exit(0);
  }
}

// 执行测试
testEmployeeRounding();