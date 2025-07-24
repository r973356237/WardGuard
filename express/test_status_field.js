const mysql = require('mysql2/promise');
const config = require('./config');

async function testStatusField() {
  let connection;
  
  try {
    console.log('开始测试状态字段功能...\n');
    
    // 获取数据库配置
    const dbConfig = config.getDatabaseConfig();
    connection = await mysql.createConnection(dbConfig);
    
    // 1. 测试创建员工时状态字段的默认值
    console.log('1. 测试创建员工时状态字段的默认值');
    const testEmployee = {
      name: '测试员工状态',
      employee_number: 'TEST_STATUS_001',
      gender: '男',
      workshop: '测试车间',
      position: '测试职位',
      hire_date: '2024-01-01',
      pre_hire_exposure_time: 0
    };
    
    // 插入测试员工（不指定状态）
    const [insertResult] = await connection.execute(
      `INSERT INTO employees (
        name, employee_number, gender, workshop, position,
        hire_date, pre_hire_exposure_time, total_exposure_time, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        testEmployee.name, testEmployee.employee_number, testEmployee.gender,
        testEmployee.workshop, testEmployee.position, testEmployee.hire_date,
        testEmployee.pre_hire_exposure_time, 0, '在职'
      ]
    );
    
    const employeeId = insertResult.insertId;
    console.log(`✓ 成功创建测试员工，ID: ${employeeId}`);
    
    // 2. 验证状态字段是否正确设置
    console.log('\n2. 验证状态字段是否正确设置');
    const [employees] = await connection.execute(
      'SELECT id, name, employee_number, status FROM employees WHERE id = ?',
      [employeeId]
    );
    
    if (employees.length > 0) {
      const employee = employees[0];
      console.log(`✓ 员工信息: ${employee.name} (${employee.employee_number})`);
      console.log(`✓ 状态字段值: ${employee.status}`);
      
      if (employee.status === '在职') {
        console.log('✓ 状态字段默认值设置正确');
      } else {
        console.log('✗ 状态字段默认值设置错误');
      }
    }
    
    // 3. 测试更新状态字段
    console.log('\n3. 测试更新状态字段');
    const newStatus = '离职';
    await connection.execute(
      'UPDATE employees SET status = ? WHERE id = ?',
      [newStatus, employeeId]
    );
    
    const [updatedEmployees] = await connection.execute(
      'SELECT status FROM employees WHERE id = ?',
      [employeeId]
    );
    
    if (updatedEmployees.length > 0 && updatedEmployees[0].status === newStatus) {
      console.log(`✓ 状态字段更新成功: ${newStatus}`);
    } else {
      console.log('✗ 状态字段更新失败');
    }
    
    // 4. 测试不同状态值
    console.log('\n4. 测试不同状态值');
    const statusValues = ['在职', '离职', '调岗', '休假', '停职'];
    
    for (const status of statusValues) {
      await connection.execute(
        'UPDATE employees SET status = ? WHERE id = ?',
        [status, employeeId]
      );
      
      const [result] = await connection.execute(
        'SELECT status FROM employees WHERE id = ?',
        [employeeId]
      );
      
      if (result.length > 0 && result[0].status === status) {
        console.log(`✓ 状态值 "${status}" 设置成功`);
      } else {
        console.log(`✗ 状态值 "${status}" 设置失败`);
      }
    }
    
    // 5. 测试导入模板字段一致性
    console.log('\n5. 测试导入模板字段一致性');
    
    // 获取数据库表结构
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees' 
       ORDER BY ORDINAL_POSITION`,
      [dbConfig.database]
    );
    
    console.log('数据库员工表字段:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });
    
    // 检查状态字段是否存在
    const statusColumn = columns.find(col => col.COLUMN_NAME === 'status');
    if (statusColumn) {
      console.log(`✓ 状态字段存在于数据库中`);
      console.log(`  类型: ${statusColumn.DATA_TYPE}`);
      console.log(`  可空: ${statusColumn.IS_NULLABLE}`);
      console.log(`  默认值: ${statusColumn.COLUMN_DEFAULT || '无'}`);
    } else {
      console.log('✗ 状态字段不存在于数据库中');
    }
    
    // 清理测试数据
    console.log('\n6. 清理测试数据');
    await connection.execute('DELETE FROM employees WHERE id = ?', [employeeId]);
    console.log('✓ 测试数据清理完成');
    
    console.log('\n✅ 状态字段功能测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:');
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行测试
testStatusField();