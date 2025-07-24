const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: '117.72.123.17',
  user: 'fanjk-ward',
  password: 'xiaokai123',
  database: 'ward',
  port: 3306
};

// 测试数据
const testData = {
  employee: {
    name: '测试员工',
    employee_number: 'TEST001',
    gender: '男',
    workshop: '测试车间',
    position: '测试职位',
    birth_date: '1990-01-01',
    hire_date: '2024-01-01',
    work_start_date: '2024-01-01',
    original_company: '测试公司',
    total_exposure_time: 2.5,
    pre_hire_exposure_time: 1.0,
    id_number: '123456789012345678',
    status: '在职'
  },
  medicine: {
    medicine_name: '测试药品',
    storage_location: '测试位置A-01',
    production_date: '2024-01-01',
    validity_period_days: 730,
    quantity: 100
  },
  supply: {
    supply_name: '测试物资',
    storage_location: '测试位置B-01',
    production_date: '2024-01-01',
    validity_period_days: 365,
    supply_number: 'TEST_SUP001'
  },
  medicalExamination: {
    employee_number: 'TEST001',
    examination_date: '2024-01-01',
    audiometry_result: '正常',
    dust_examination_result: '正常',
    need_recheck: 0,
    recheck_date: null,
    audiometry_recheck_result: null,
    dust_recheck_result: null
  }
};

async function testImportFunctionality() {
  let connection;
  
  try {
    console.log('开始测试导入功能...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');
    
    const testResults = {
      employee: { success: false, error: null, id: null },
      medicine: { success: false, error: null, id: null },
      supply: { success: false, error: null, id: null },
      medicalExamination: { success: false, error: null, id: null }
    };
    
    // 测试员工导入
    try {
      console.log('\n--- 测试员工导入 ---');
      const employeeData = testData.employee;
      const [result] = await connection.execute(
        'INSERT INTO employees (name, employee_number, gender, workshop, position, birth_date, hire_date, work_start_date, original_company, total_exposure_time, pre_hire_exposure_time, id_number, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [employeeData.name, employeeData.employee_number, employeeData.gender, employeeData.workshop, employeeData.position, employeeData.birth_date, employeeData.hire_date, employeeData.work_start_date, employeeData.original_company, employeeData.total_exposure_time, employeeData.pre_hire_exposure_time, employeeData.id_number, employeeData.status]
      );
      testResults.employee.success = true;
      testResults.employee.id = result.insertId;
      console.log('✅ 员工导入测试成功，ID:', result.insertId);
    } catch (error) {
      testResults.employee.error = error.message;
      console.log('❌ 员工导入测试失败:', error.message);
    }
    
    // 测试药品导入
    try {
      console.log('\n--- 测试药品导入 ---');
      const medicineData = testData.medicine;
      // 计算过期日期
      const expiration_date = new Date(medicineData.production_date);
      expiration_date.setDate(expiration_date.getDate() + medicineData.validity_period_days);
      
      const [result] = await connection.execute(
        'INSERT INTO medicines (medicine_name, storage_location, production_date, validity_period_days, quantity, expiration_date) VALUES (?, ?, ?, ?, ?, ?)',
        [medicineData.medicine_name, medicineData.storage_location, medicineData.production_date, medicineData.validity_period_days, medicineData.quantity, expiration_date]
      );
      testResults.medicine.success = true;
      testResults.medicine.id = result.insertId;
      console.log('✅ 药品导入测试成功，ID:', result.insertId);
    } catch (error) {
      testResults.medicine.error = error.message;
      console.log('❌ 药品导入测试失败:', error.message);
    }
    
    // 测试物资导入
    try {
      console.log('\n--- 测试物资导入 ---');
      const supplyData = testData.supply;
      // 计算过期日期
      const expiration_date = new Date(supplyData.production_date);
      expiration_date.setDate(expiration_date.getDate() + supplyData.validity_period_days);
      
      const [result] = await connection.execute(
        'INSERT INTO supplies (supply_name, storage_location, production_date, validity_period_days, supply_number, expiration_date) VALUES (?, ?, ?, ?, ?, ?)',
        [supplyData.supply_name, supplyData.storage_location, supplyData.production_date, supplyData.validity_period_days, supplyData.supply_number, expiration_date]
      );
      testResults.supply.success = true;
      testResults.supply.id = result.insertId;
      console.log('✅ 物资导入测试成功，ID:', result.insertId);
    } catch (error) {
      testResults.supply.error = error.message;
      console.log('❌ 物资导入测试失败:', error.message);
    }
    
    // 测试体检记录导入（需要先有员工数据）
    try {
      console.log('\n--- 测试体检记录导入 ---');
      if (testResults.employee.success) {
        const examData = testData.medicalExamination;
        const [result] = await connection.execute(
          'INSERT INTO medical_examinations (employee_number, examination_date, audiometry_result, dust_examination_result, need_recheck, recheck_date, audiometry_recheck_result, dust_recheck_result) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [examData.employee_number, examData.examination_date, examData.audiometry_result, examData.dust_examination_result, examData.need_recheck, examData.recheck_date, examData.audiometry_recheck_result, examData.dust_recheck_result]
        );
        testResults.medicalExamination.success = true;
        testResults.medicalExamination.id = result.insertId;
        console.log('✅ 体检记录导入测试成功，ID:', result.insertId);
      } else {
        console.log('⚠️ 跳过体检记录测试，因为员工导入失败');
      }
    } catch (error) {
      testResults.medicalExamination.error = error.message;
      console.log('❌ 体检记录导入测试失败:', error.message);
    }
    
    // 清理测试数据
    console.log('\n--- 清理测试数据 ---');
    if (testResults.medicalExamination.id) {
      await connection.execute('DELETE FROM medical_examinations WHERE id = ?', [testResults.medicalExamination.id]);
      console.log('✅ 清理体检记录测试数据');
    }
    if (testResults.supply.id) {
      await connection.execute('DELETE FROM supplies WHERE id = ?', [testResults.supply.id]);
      console.log('✅ 清理物资测试数据');
    }
    if (testResults.medicine.id) {
      await connection.execute('DELETE FROM medicines WHERE id = ?', [testResults.medicine.id]);
      console.log('✅ 清理药品测试数据');
    }
    if (testResults.employee.id) {
      await connection.execute('DELETE FROM employees WHERE id = ?', [testResults.employee.id]);
      console.log('✅ 清理员工测试数据');
    }
    
    // 输出测试结果总结
    console.log('\n=== 测试结果总结 ===');
    const successCount = Object.values(testResults).filter(result => result.success).length;
    const totalCount = Object.keys(testResults).length;
    
    console.log(`总测试项目: ${totalCount}`);
    console.log(`成功项目: ${successCount}`);
    console.log(`失败项目: ${totalCount - successCount}`);
    
    if (successCount === totalCount) {
      console.log('🎉 所有导入功能测试通过！');
    } else {
      console.log('⚠️ 部分导入功能存在问题：');
      Object.entries(testResults).forEach(([type, result]) => {
        if (!result.success) {
          console.log(`  - ${type}: ${result.error}`);
        }
      });
    }
    
  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
    console.error('错误详情:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

// 运行测试
testImportFunctionality();