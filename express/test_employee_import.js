const mysql = require('mysql2/promise');
const config = require('./config');

async function testEmployeeImport() {
  let connection;
  
  try {
    console.log('连接数据库...');
    const dbConfig = config.getDatabaseConfig();
    connection = await mysql.createConnection(dbConfig);
    
    // 测试数据
    const testEmployee = {
      name: '测试员工',
      employee_number: 'TEST001',
      gender: '男',
      workshop: '测试车间',
      position: '测试职位',
      birth_date: '1990-01-01',
      hire_date: '2024-01-01',
      work_start_date: '2024-01-01',
      original_company: '测试公司',
      total_exposure_time: 1.5,
      pre_hire_exposure_time: 0.5,
      id_number: '123456789012345678',
      status: '在职'
    };
    
    console.log('测试插入员工数据...');
    
    // 检查工号是否已存在
    const [existingEmployees] = await connection.execute(
      'SELECT * FROM employees WHERE employee_number = ?', 
      [testEmployee.employee_number]
    );
    
    if (existingEmployees.length > 0) {
      console.log('测试工号已存在，先删除...');
      await connection.execute(
        'DELETE FROM employees WHERE employee_number = ?', 
        [testEmployee.employee_number]
      );
    }
    
    // 插入测试数据
    const [result] = await connection.execute(
      `INSERT INTO employees (
        name, employee_number, gender, workshop, position,
        birth_date, hire_date, work_start_date, original_company,
        total_exposure_time, pre_hire_exposure_time, id_number, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        testEmployee.name, testEmployee.employee_number, testEmployee.gender, 
        testEmployee.workshop, testEmployee.position,
        testEmployee.birth_date, testEmployee.hire_date, testEmployee.work_start_date, 
        testEmployee.original_company,
        testEmployee.total_exposure_time, testEmployee.pre_hire_exposure_time, 
        testEmployee.id_number, testEmployee.status
      ]
    );
    
    console.log('员工数据插入成功，ID:', result.insertId);
    
    // 验证插入的数据
    const [insertedEmployee] = await connection.execute(
      'SELECT * FROM employees WHERE employee_number = ?', 
      [testEmployee.employee_number]
    );
    
    console.log('插入的员工数据:', insertedEmployee[0]);
    
    // 清理测试数据
    await connection.execute(
      'DELETE FROM employees WHERE employee_number = ?', 
      [testEmployee.employee_number]
    );
    
    console.log('测试数据已清理');
    console.log('员工导入功能测试通过！');
    
  } catch (error) {
    console.error('测试员工导入失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testEmployeeImport();